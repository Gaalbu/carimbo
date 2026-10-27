import type {
  CheckerWithCount,
  ClaimDetail,
  ClaimSummary,
  CoverageResponse,
  CoverageRow,
  Election,
  SearchResult,
  StatsResponse,
  ThemeWithCount,
  VerdictCounts,
} from './api-contract.js'
import { FACT_CHECKERS } from './checkers.js'
import { addDays, saoPauloDay } from './dates.js'
import { ELECTIONS, findElection, isInCampaign } from './elections.js'
import { compareNewestFirst, dedupeReviews, findRelated, groupReviews } from './grouping.js'
import type { Review, ReviewStore } from './review.js'
import { createSearchIndex, type SearchIndex } from './search.js'
import { THEMES } from './themes.js'
import { VERDICTS, type Verdict } from './verdict.js'

/**
 * Read-side queries behind the API routes, as pure functions over a snapshot of the store. The
 * API serves them over HTTP; the static site runs them in the browser. No I/O, no Node APIs.
 */

/** Everything the queries need, derived once per version of the store. */
export interface StoreSnapshot {
  /** `ReviewStore.generatedAt`, or null when no store exists yet. */
  readonly generatedAt: string | null
  /** Unique by `id`. */
  readonly reviews: readonly Review[]
  /** Newest first. */
  readonly claims: readonly ClaimSummary[]
  readonly claimsBySlug: ReadonlyMap<string, ClaimSummary>
  readonly search: SearchIndex
}

export function buildSnapshot(store: ReviewStore | null): StoreSnapshot {
  const reviews = dedupeReviews(store?.reviews ?? [])
  const claims = groupReviews(reviews).sort(compareNewestFirst)
  return {
    generatedAt: store?.generatedAt ?? null,
    reviews,
    claims,
    claimsBySlug: new Map(claims.map((claim) => [claim.slug, claim])),
    search: createSearchIndex(claims),
  }
}

export const EMPTY_SNAPSHOT: StoreSnapshot = buildSnapshot(null)

export function countVerdicts(reviews: Iterable<Review>): VerdictCounts {
  const counts = Object.fromEntries(VERDICTS.map((verdict) => [verdict, 0])) as Record<
    Verdict,
    number
  >
  for (const review of reviews) counts[review.verdict] += 1
  return counts
}

/** Filters of `GET /v1/claims`, already validated. */
export interface ClaimFilters {
  readonly verdict?: Verdict | undefined
  readonly checker?: string | undefined
  readonly theme?: string | undefined
  readonly election?: number | undefined
}

/** A page addressed by offset; callers turn `nextOffset` into their own opaque cursor. */
export interface OffsetPage<T> {
  readonly items: readonly T[]
  readonly total: number
  /** Offset of the next page, or null at the end. */
  readonly nextOffset: number | null
}

/** A group matches when at least one of its reviews matches; the group is returned whole. */
export function matchesFilters(claim: ClaimSummary, filters: ClaimFilters): boolean {
  const { verdict, checker, theme, election } = filters
  if (verdict !== undefined && !claim.reviews.some((review) => review.verdict === verdict)) {
    return false
  }
  if (checker !== undefined && !claim.reviews.some((review) => review.checkerId === checker)) {
    return false
  }
  if (theme !== undefined && !claim.themes.includes(theme)) return false
  if (election !== undefined) {
    const period = findElection(election)
    if (period === undefined) return false
    return claim.reviews.some((review) => isInCampaign(review.reviewDate, period))
  }
  return true
}

/** `GET /v1/claims`: newest first, filtered, one page from `offset`. */
export function listClaims(
  snapshot: StoreSnapshot,
  filters: ClaimFilters,
  offset: number,
  limit: number,
): OffsetPage<ClaimSummary> {
  const filtered = snapshot.claims.filter((claim) => matchesFilters(claim, filters))
  const end = offset + limit
  return {
    items: filtered.slice(offset, end),
    total: filtered.length,
    nextOffset: end < filtered.length ? end : null,
  }
}

/** `GET /v1/claims/:slug`, or null when the slug is unknown. */
export function claimDetail(snapshot: StoreSnapshot, slug: string): ClaimDetail | null {
  const claim = snapshot.claimsBySlug.get(slug)
  if (claim === undefined) return null
  return { ...claim, related: findRelated(claim, snapshot.claims) }
}

/** `GET /v1/search`: the query must already be trimmed and long enough. */
export function searchSnapshot(
  snapshot: StoreSnapshot,
  query: string,
  limit: number,
): SearchResult {
  return { query, items: snapshot.search.search(query, { limit }) }
}

function inWindow(review: Review, from: string, to: string): boolean {
  return review.reviewDate !== null && review.reviewDate >= from && review.reviewDate <= to
}

/** `GET /v1/stats/today`: reviews published in the `days` ending today in Brasília time. */
export function statsForWindow(snapshot: StoreSnapshot, now: Date, days: number): StatsResponse {
  const to = saoPauloDay(now)
  const from = addDays(to, 1 - days)
  const windowed = snapshot.reviews.filter((review) => inWindow(review, from, to))
  return {
    from,
    to,
    counts: countVerdicts(windowed),
    total: windowed.length,
    indexed: snapshot.reviews.length,
    updatedAt: snapshot.generatedAt,
  }
}

/** `GET /v1/checkers` */
export function checkersWithCounts(snapshot: StoreSnapshot): CheckerWithCount[] {
  const counts = new Map<string, number>()
  for (const review of snapshot.reviews) {
    counts.set(review.checkerId, (counts.get(review.checkerId) ?? 0) + 1)
  }
  return FACT_CHECKERS.map((checker) => ({ ...checker, count: counts.get(checker.id) ?? 0 }))
}

/** `GET /v1/themes`: counts reviews of the groups tagged with each theme. */
export function themesWithCounts(snapshot: StoreSnapshot): ThemeWithCount[] {
  return THEMES.map((theme) => ({
    slug: theme.slug,
    name: theme.name,
    count: snapshot.claims
      .filter((claim) => claim.themes.includes(theme.slug))
      .reduce((sum, claim) => sum + claim.reviews.length, 0),
  }))
}

/** `GET /v1/elections`: newest election first. */
export function electionsWithCounts(snapshot: StoreSnapshot): Election[] {
  return [...ELECTIONS].reverse().map((election) => {
    const reviews = snapshot.reviews.filter((review) => isInCampaign(review.reviewDate, election))
    return {
      year: election.year,
      campaignStart: election.campaignStart,
      campaignEnd: election.campaignEnd,
      counts: countVerdicts(reviews),
      total: reviews.length,
    }
  })
}

/** First election with fact-checking on record (docs/PLANO.md §4.5): coverage starts here. */
export const FIRST_COVERAGE_YEAR = 2014

function coverageRows(reviews: readonly Review[]): CoverageRow[] {
  const byKey = new Map<string, Review[]>()
  for (const review of reviews) {
    if (review.reviewDate === null) continue
    const key = `${review.checkerId}|${review.reviewDate.slice(0, 4)}`
    const list = byKey.get(key)
    if (list === undefined) byKey.set(key, [review])
    else list.push(review)
  }
  const order = new Map(FACT_CHECKERS.map((checker, index) => [checker.id, index]))
  return [...byKey.entries()]
    .map(([key, list]): CoverageRow => {
      const [checkerId = '', year = ''] = key.split('|')
      const dates = list.map((review) => review.reviewDate ?? '').sort()
      return {
        checkerId,
        year: Number(year),
        count: list.length,
        firstDate: dates[0] ?? null,
        lastDate: dates.at(-1) ?? null,
        methods: [...new Set(list.map((review) => review.provenance.method))].sort(),
      }
    })
    .sort(
      (a, b) =>
        (order.get(a.checkerId) ?? order.size) - (order.get(b.checkerId) ?? order.size) ||
        a.checkerId.localeCompare(b.checkerId) ||
        a.year - b.year,
    )
}

/** `GET /v1/coverage`: years run from 2014 (or the oldest data) to the current year. */
export function coverage(snapshot: StoreSnapshot, now: Date): CoverageResponse {
  const rows = coverageRows(snapshot.reviews)
  const dataYears = rows.map((row) => row.year)
  const first = Math.min(FIRST_COVERAGE_YEAR, ...dataYears)
  const last = Math.max(Number(saoPauloDay(now).slice(0, 4)), ...dataYears)
  return {
    years: Array.from({ length: last - first + 1 }, (_, index) => first + index),
    checkers: FACT_CHECKERS,
    rows,
  }
}

/** Body of `GET /v1/export.json`. */
export interface ExportBody {
  readonly schemaVersion: 1
  readonly generatedAt: string | null
  readonly reviews: readonly Review[]
}

export function exportJson(snapshot: StoreSnapshot): ExportBody {
  return { schemaVersion: 1, generatedAt: snapshot.generatedAt, reviews: snapshot.reviews }
}
