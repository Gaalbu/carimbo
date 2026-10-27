import type { Review } from '@carimbo/core'
import {
  buildReview,
  CLAIMREVIEW_PARSER_VERSION,
  type ClaimReviewExtraction,
  extractClaimReviews,
  type FetchedResource,
  parseFeed,
  parseSitemap,
  sha256Hex,
  type SitemapEntry,
} from '@carimbo/sources'

import type { CheckerSource } from './checkers.js'
import { compareStoreOrder } from './store.js'

/** Ingestion pipeline stages, in the order a fact-check flows through them (docs/PLANO.md §6). */
export const QUEUE_NAMES = ['poll-sources', 'extract', 'normalize', 'dedupe'] as const

export type QueueName = (typeof QUEUE_NAMES)[number]

const POLL_INTERVAL_MINUTES = 15
const MS_PER_MINUTE = 60_000

export const POLL_INTERVAL_MS = POLL_INTERVAL_MINUTES * MS_PER_MINUTE

export function describePipeline(): string {
  return QUEUE_NAMES.join(' → ')
}

/** The only network capability the stages need; `PoliteFetcher` provides it. */
export interface PageFetcher {
  get(url: string): Promise<FetchedResource>
}

export interface Logger {
  info(message: string): void
  warn(message: string): void
}

/** A page that may hold a fact-check, found in a feed or sitemap. */
export interface Candidate {
  readonly checkerId: string
  readonly url: string
  readonly via: 'rss' | 'sitemap'
  /** When the listing says it was published or modified; only used to order and filter. */
  readonly listedAt: string | null
}

export interface PollOptions {
  /** YYYY-MM-DD; when set, the checker's sitemap is walked back to this date. */
  readonly since: string | null
}

/**
 * Stage `poll-sources`: lists candidate pages of one checker, from its recent feeds and, with
 * `since`, from its sitemap. A failing listing is logged and skipped, never fatal.
 */
export async function pollSources(
  checker: CheckerSource,
  fetcher: PageFetcher,
  options: PollOptions,
  log: Logger,
): Promise<Candidate[]> {
  const candidates: Candidate[] = []
  for (const source of checker.recent) {
    try {
      const listing = await fetcher.get(source.url)
      const items =
        source.kind === 'rss'
          ? parseFeed(listing.text, listing.finalUrl).map((item) => ({
              loc: item.link,
              lastmod: item.publishedAt,
            }))
          : await sitemapPages(listing, fetcher, () => true, log)
      for (const item of items) {
        candidates.push({
          checkerId: checker.checkerId,
          url: item.loc,
          via: source.kind,
          listedAt: item.lastmod,
        })
      }
    } catch (error) {
      log.warn(`[${checker.checkerId}] falha ao ler ${source.url}: ${describeError(error)}`)
    }
  }

  const { since } = options
  if (since !== null && checker.backfill !== null) {
    const backfill = checker.backfill
    try {
      const index = await fetcher.get(backfill.indexUrl)
      const entries = await sitemapPages(
        index,
        fetcher,
        (loc) => backfill.includeChild(loc, since),
        log,
      )
      const recentEnough = entries
        .filter((entry) => backfill.includePage(entry.loc))
        .filter((entry) => entry.lastmod === null || entry.lastmod.slice(0, since.length) >= since)
        .sort((a, b) => (b.lastmod ?? '').localeCompare(a.lastmod ?? ''))
      for (const entry of recentEnough) {
        candidates.push({
          checkerId: checker.checkerId,
          url: entry.loc,
          via: 'sitemap',
          listedAt: entry.lastmod,
        })
      }
    } catch (error) {
      log.warn(
        `[${checker.checkerId}] falha no sitemap ${backfill.indexUrl}: ${describeError(error)}`,
      )
    }
  }
  return uniqueByUrl(candidates)
}

/** Pages of a sitemap; for an index, the pages of the children `includeChild` accepts. */
async function sitemapPages(
  listing: FetchedResource,
  fetcher: PageFetcher,
  includeChild: (loc: string) => boolean,
  log: Logger,
): Promise<SitemapEntry[]> {
  const sitemap = parseSitemap(listing.text, listing.finalUrl)
  if (sitemap.kind === 'urlset') return [...sitemap.entries]
  const pages: SitemapEntry[] = []
  for (const child of sitemap.entries) {
    if (!includeChild(child.loc)) continue
    try {
      const fetched = await fetcher.get(child.loc)
      const childSitemap = parseSitemap(fetched.text, fetched.finalUrl)
      if (childSitemap.kind === 'urlset') pages.push(...childSitemap.entries)
    } catch (error) {
      log.warn(`falha no sitemap ${child.loc}: ${describeError(error)}`)
    }
  }
  return pages
}

function uniqueByUrl(candidates: readonly Candidate[]): Candidate[] {
  const seen = new Set<string>()
  return candidates.filter((candidate) => {
    const key = canonicalUrl(candidate.url)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Absolute URL without fragment, the key used to fetch each page once. */
export function canonicalUrl(url: string): string {
  const parsed = new URL(url)
  parsed.hash = ''
  return parsed.href
}

/** Stage `extract`: the ClaimReviews of a fetched page. Pure. */
export function extract(page: FetchedResource): ClaimReviewExtraction {
  return extractClaimReviews(page.text, page.finalUrl)
}

/**
 * Stage `normalize`: extracted fields → `Review`, with full provenance and the stamp from
 * `normalizeRating` only. Pure. Several ClaimReviews of a page sharing one URL would share an
 * id; only the first is kept and the rest are reported.
 */
export function normalize(
  extraction: ClaimReviewExtraction,
  page: FetchedResource,
  checkerId: string,
): { readonly reviews: Review[]; readonly duplicates: number } {
  const provenance = {
    sourceUrl: page.finalUrl,
    fetchedAt: page.fetchedAt,
    method: 'claimreview',
    parserVersion: CLAIMREVIEW_PARSER_VERSION,
    rawSha256: sha256Hex(page.body),
  } as const
  const reviews = new Map<string, Review>()
  let duplicates = 0
  for (const extracted of extraction.reviews) {
    const review = buildReview(extracted, { checkerId, provenance })
    if (reviews.has(review.id)) duplicates++
    else reviews.set(review.id, review)
  }
  return { reviews: [...reviews.values()], duplicates }
}

export interface DedupeResult {
  /** The whole store, in store order. */
  readonly reviews: Review[]
  readonly added: number
  readonly updated: number
  /** Reviews whose rating differs from the stored one (the checker changed its mind). */
  readonly ratingChanges: readonly { readonly before: Review; readonly after: Review }[]
}

/**
 * Stage `dedupe`: merges new reviews into the store by id. A newer fetch replaces the stored
 * record; with `keepExisting`, stored records win (for lower-priority sources). Pure.
 */
export function dedupe(
  existing: readonly Review[],
  incoming: readonly Review[],
  options: { readonly keepExisting?: boolean } = {},
): DedupeResult {
  const byId = new Map(existing.map((review) => [review.id, review]))
  let added = 0
  let updated = 0
  const ratingChanges: { before: Review; after: Review }[] = []
  for (const review of incoming) {
    const before = byId.get(review.id)
    if (before === undefined) {
      added++
    } else {
      if (options.keepExisting === true) continue
      updated++
      if (before.textualRating !== review.textualRating)
        ratingChanges.push({ before, after: review })
    }
    byId.set(review.id, review)
  }
  return { reviews: [...byId.values()].sort(compareStoreOrder), added, updated, ratingChanges }
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
