import type { FactChecker, Review } from './review.js'
import type { Verdict } from './verdict.js'

/**
 * Response shapes of apps/api, consumed by apps/web. The API owns these; the web app only reads
 * them. All dates are ISO strings.
 */

/** Several reviews of the same claim, grouped by the API. Verdicts are never merged. */
export interface ClaimSummary {
  readonly slug: string
  /** Text of the earliest review in the group. */
  readonly claimText: string
  readonly claimant: string | null
  /** Most recent `reviewDate` in the group, or null when none is informed. */
  readonly latestReviewDate: string | null
  readonly themes: readonly string[]
  /** One entry per review, side by side. */
  readonly reviews: readonly Review[]
}

export interface Page<T> {
  readonly items: readonly T[]
  readonly total: number
  /** Opaque cursor for the next page, or null at the end. */
  readonly nextCursor: string | null
}

/** `GET /v1/claims?verdict=&checker=&theme=&election=&cursor=&limit=` → `Page<ClaimSummary>` */
export interface ClaimsQuery {
  readonly verdict?: Verdict
  readonly checker?: string
  readonly theme?: string
  /** Election year: restricts to that year's official campaign period. */
  readonly election?: number
  readonly cursor?: string
  readonly limit?: number
}

/** `GET /v1/claims/:slug` */
export interface ClaimDetail extends ClaimSummary {
  /** Other groups that look similar but were not merged. */
  readonly related: readonly ClaimSummary[]
}

/** `GET /v1/search?q=` */
export interface SearchResult {
  readonly query: string
  readonly items: readonly (ClaimSummary & { readonly score: number })[]
}

export type VerdictCounts = Readonly<Record<Verdict, number>>

/** `GET /v1/stats/today?days=1` — counts of reviews published in the window. */
export interface StatsResponse {
  /** Inclusive window, YYYY-MM-DD. */
  readonly from: string
  readonly to: string
  readonly counts: VerdictCounts
  readonly total: number
  /** Total reviews indexed, all time. */
  readonly indexed: number
  /** Last ingest run (`ReviewStore.generatedAt`). */
  readonly updatedAt: string | null
}

/** `GET /v1/checkers` */
export interface CheckerWithCount extends FactChecker {
  readonly count: number
}

/** `GET /v1/themes` */
export interface ThemeWithCount {
  readonly slug: string
  readonly name: string
  readonly count: number
}

/** `GET /v1/elections` */
export interface Election {
  readonly year: number
  /** Official campaign period (TSE calendar), YYYY-MM-DD. */
  readonly campaignStart: string
  readonly campaignEnd: string
  readonly counts: VerdictCounts
  readonly total: number
}

/** `GET /v1/coverage` — one row per checker × year that has data; missing pairs are gaps. */
export interface CoverageRow {
  readonly checkerId: string
  readonly year: number
  readonly count: number
  readonly firstDate: string | null
  readonly lastDate: string | null
  readonly methods: readonly string[]
}

export interface CoverageResponse {
  readonly years: readonly number[]
  readonly checkers: readonly FactChecker[]
  readonly rows: readonly CoverageRow[]
}
