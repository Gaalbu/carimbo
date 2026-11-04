import type { Review, ReviewStore } from '@carimbo/core'
import {
  buildReview,
  type FactCheckApiClient,
  FACTCHECK_API_PARSER_VERSION,
  sha256Hex,
} from '@carimbo/sources'

import { CHECKER_SOURCES, type CheckerSource } from './checkers.js'
import {
  type Candidate,
  canonicalUrl,
  dedupe,
  describeError,
  extract,
  type Logger,
  normalize,
  type PageFetcher,
  pollSources,
} from './queues.js'
import type { RawStore } from './raw-store.js'

export interface IngestOptions {
  /** YYYY-MM-DD: also walk the sitemaps back to this date. */
  readonly since: string | null
  /** Most article pages fetched per checker in this run. */
  readonly maxPages: number | null
  /** Fetch pages again even when already fetched or stored. */
  readonly refresh: boolean
  /** Only these checkers (any status); null runs every `active` checker. */
  readonly checkerIds: readonly string[] | null
}

export interface IngestDeps {
  readonly fetcher: PageFetcher
  readonly rawStore: RawStore
  readonly loadStore: () => Promise<ReviewStore>
  readonly saveStore: (store: ReviewStore) => Promise<void>
  readonly log: Logger
  readonly now: () => Date
  readonly factCheck?: FactCheckApiClient | null
  readonly sources?: readonly CheckerSource[]
}

export interface CheckerReport {
  candidates: number
  skipped: number
  fetched: number
  failed: number
  discoveryFailures: number
  withoutClaimReview: number
  reviews: number
}

export interface IngestSummary {
  readonly checkers: Readonly<Record<string, CheckerReport>>
  readonly added: number
  readonly updated: number
  readonly total: number
  /** `checkerId: label` → how many reviews carried that unmapped label. */
  readonly unknownRatings: ReadonlyMap<string, number>
  readonly parseFailures: number
}

const FACTCHECK_PAGE_SIZE = 100
const FACTCHECK_MAX_PAGES = 10
const FACTCHECK_DEFAULT_MAX_AGE_DAYS = 30
const MS_PER_DAY = 86_400_000

/**
 * One ingest run (`npm run ingest:once`): poll → fetch each page once → extract → normalize →
 * dedupe → write `data/reviews.json`. The store is saved after each checker, so an interrupted
 * run keeps what it already collected.
 */
export async function runIngest(options: IngestOptions, deps: IngestDeps): Promise<IngestSummary> {
  const { log } = deps
  let store = await deps.loadStore()

  const checkers: Record<string, CheckerReport> = {}
  const unknownRatings = new Map<string, number>()
  let parseFailures = 0
  let added = 0
  let updated = 0

  // Saves are chained so concurrent checkers never write the file at the same time.
  let saving = Promise.resolve()
  const merge = (incoming: readonly Review[], keepExisting = false): Promise<void> => {
    saving = saving.then(async () => {
      const result = dedupe(store.reviews, incoming, { keepExisting })
      added += result.added
      updated += result.updated
      for (const change of result.ratingChanges) {
        log.warn(
          `[${change.after.checkerId}] avaliação mudou: "${change.before.textualRating}" → "${change.after.textualRating}" em ${change.after.reviewUrl}`,
        )
      }
      store = {
        schemaVersion: 1,
        generatedAt: deps.now().toISOString(),
        reviews: result.reviews,
      }
      await deps.saveStore(store)
      await deps.rawStore.flush()
    })
    return saving
  }

  const noteUnknown = (review: Review): void => {
    if (review.verdict !== 'unknown') return
    const key = `${review.checkerId}: ${review.textualRating}`
    unknownRatings.set(key, (unknownRatings.get(key) ?? 0) + 1)
    log.warn(
      `[${review.checkerId}] avaliação desconhecida "${review.textualRating}" em ${review.reviewUrl}`,
    )
  }

  const selected = selectCheckers(deps.sources ?? CHECKER_SOURCES, options.checkerIds, log)

  const results = await Promise.allSettled(
    selected.map(async (checker) => {
      const report: CheckerReport = {
        candidates: 0,
        skipped: 0,
        fetched: 0,
        failed: 0,
        discoveryFailures: 0,
        withoutClaimReview: 0,
        reviews: 0,
      }
      checkers[checker.checkerId] = report
      const candidates = await pollSources(
        checker,
        deps.fetcher,
        {
          since: options.since,
          onFailure: () => {
            report.discoveryFailures++
          },
        },
        log,
      )
      report.candidates = candidates.length
      const toFetch = candidates.filter((candidate) => {
        const skip = !options.refresh && alreadySeen(candidate, deps.rawStore)
        if (skip) report.skipped++
        return !skip
      })
      const limited = options.maxPages === null ? toFetch : toFetch.slice(0, options.maxPages)
      log.info(
        `[${checker.checkerId}] ${String(candidates.length)} páginas listadas, ${String(report.skipped)} já vistas, ${String(limited.length)} a buscar`,
      )

      for (const candidate of limited) {
        let page
        try {
          page = await deps.fetcher.get(candidate.url)
        } catch (error) {
          report.failed++
          log.warn(
            `[${checker.checkerId}] falha ao buscar ${candidate.url}: ${describeError(error)}`,
          )
          continue
        }
        report.fetched++
        const rawSha256 = sha256Hex(page.body)
        await deps.rawStore.saveRaw(checker.checkerId, rawSha256, page.body, 'html')

        const extraction = extract(page)
        for (const message of extraction.errors) {
          parseFailures++
          log.warn(`[${checker.checkerId}] falha de leitura em ${page.finalUrl}: ${message}`)
        }
        const { reviews: pageReviews, duplicates } = normalize(extraction, page, checker.checkerId)
        if (duplicates > 0) {
          log.warn(
            `[${checker.checkerId}] ${String(duplicates)} ClaimReview com url repetida em ${page.finalUrl}; mantida a primeira`,
          )
        }
        if (pageReviews.length === 0) report.withoutClaimReview++
        pageReviews.forEach(noteUnknown)
        await merge(pageReviews)
        report.reviews += pageReviews.length
        deps.rawStore.recordFetch(canonicalUrl(candidate.url), {
          checkerId: checker.checkerId,
          fetchedAt: page.fetchedAt,
          finalUrl: page.finalUrl,
          rawSha256,
          reviewIds: pageReviews.map((review) => review.id),
        })
        await deps.rawStore.flush()
      }
      log.info(
        `[${checker.checkerId}] ${String(report.fetched)} buscadas, ${String(report.reviews)} checagens, ${String(report.withoutClaimReview)} sem ClaimReview, ${String(report.failed)} falhas`,
      )
    }),
  )

  const failure = results.find((result) => result.status === 'rejected')
  if (failure?.status === 'rejected') throw failure.reason

  if (deps.factCheck) {
    await pollFactCheckApi(deps.factCheck, options, deps, noteUnknown, merge)
  }
  await saving

  return {
    checkers,
    added,
    updated,
    total: store.reviews.length,
    unknownRatings,
    parseFailures,
  }
}

function selectCheckers(
  sources: readonly CheckerSource[],
  checkerIds: readonly string[] | null,
  log: Logger,
): CheckerSource[] {
  if (checkerIds !== null) {
    const unknown = checkerIds.filter((id) => !sources.some((source) => source.checkerId === id))
    if (unknown.length > 0) throw new Error(`checador desconhecido: ${unknown.join(', ')}`)
    return sources.filter((source) => checkerIds.includes(source.checkerId))
  }
  for (const source of sources) {
    if (source.status !== 'active') {
      log.info(`[${source.checkerId}] pulado (${source.status}); ver docs/spikes/S2-fontes.md`)
    }
  }
  return sources.filter((source) => source.status === 'active')
}

function alreadySeen(candidate: Candidate, rawStore: RawStore): boolean {
  const url = safeCanonical(candidate.url)
  return rawStore.getFetch(url) !== undefined
}

function safeCanonical(url: string): string {
  try {
    return canonicalUrl(url)
  } catch {
    return url
  }
}

/** Google Fact Check Tools, per checker site; used only when `FACTCHECK_API_KEY` is set. */
async function pollFactCheckApi(
  client: FactCheckApiClient,
  options: IngestOptions,
  deps: IngestDeps,
  noteUnknown: (review: Review) => void,
  merge: (reviews: readonly Review[], keepExisting?: boolean) => Promise<void>,
): Promise<void> {
  const sources = (deps.sources ?? CHECKER_SOURCES).filter(
    (source) =>
      source.factCheckSite !== null &&
      (options.checkerIds === null || options.checkerIds.includes(source.checkerId)),
  )
  const maxAgeDays =
    options.since === null
      ? FACTCHECK_DEFAULT_MAX_AGE_DAYS
      : Math.max(1, Math.ceil((deps.now().getTime() - Date.parse(options.since)) / MS_PER_DAY))
  for (const source of sources) {
    const site = source.factCheckSite
    if (site === null) continue
    let pageToken: string | undefined
    for (let page = 0; page < FACTCHECK_MAX_PAGES; page++) {
      let result
      try {
        result = await client.search({
          reviewPublisherSiteFilter: site,
          maxAgeDays,
          pageSize: FACTCHECK_PAGE_SIZE,
          ...(pageToken === undefined ? {} : { pageToken }),
        })
      } catch (error) {
        deps.log.warn(
          `[${source.checkerId}] Fact Check API resultado parcial: ${describeError(error)}`,
        )
        break
      }
      const reviews: Review[] = []
      const rawSha256 = sha256Hex(result.raw)
      await deps.rawStore.saveRaw(
        source.checkerId,
        rawSha256,
        new TextEncoder().encode(result.raw),
        'json',
      )
      for (const extracted of result.reviews) {
        const review = buildReview(extracted, {
          checkerId: source.checkerId,
          provenance: {
            sourceUrl: result.requestUrl,
            fetchedAt: result.fetchedAt,
            method: 'factcheck_api',
            parserVersion: FACTCHECK_API_PARSER_VERSION,
            rawSha256,
          },
        })
        noteUnknown(review)
        reviews.push(review)
      }
      await merge(reviews, true)
      if (result.nextPageToken === null) break
      if (page === FACTCHECK_MAX_PAGES - 1) {
        deps.log.warn(
          `[${source.checkerId}] Fact Check API truncada após ${String(FACTCHECK_MAX_PAGES)} páginas; resultado parcial`,
        )
      }
      pageToken = result.nextPageToken
    }
  }
}
