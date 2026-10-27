import type { Verdict } from './verdict.js'

/** How a review reached the Carimbo (docs/PLANO.md §4.5, regra 1). */
export const SOURCE_METHODS = ['factcheck_api', 'claimreview', 'html_parser', 'wayback'] as const

export type SourceMethod = (typeof SOURCE_METHODS)[number]

/** Mandatory on every stored review: a record without it never enters the store. */
export interface Provenance {
  /** Page or endpoint the raw content was fetched from. */
  readonly sourceUrl: string
  /** ISO 8601 instant of the fetch. */
  readonly fetchedAt: string
  readonly method: SourceMethod
  /** Version of the parser that produced the structured fields, e.g. `claimreview@1`. */
  readonly parserVersion: string
  /** Hex SHA-256 of the raw content as fetched. */
  readonly rawSha256: string
}

/** One fact-check of one claim by one checker. Only structured fields, never the article text. */
export interface Review {
  /**
   * Stable id: first 16 hex chars of SHA-256 of `reviewUrl`; for the 2nd+ review of a page that
   * shares one URL, of `reviewUrl + "\n" + claimText`.
   */
  readonly id: string
  /** Key into the checker catalog (`FactChecker.id`). */
  readonly checkerId: string
  /** The claim as the checker wrote it (`claimReviewed`). */
  readonly claimText: string
  /** Who said it, when the ClaimReview informs (`itemReviewed.author.name`). */
  readonly claimant: string | null
  /** ISO date (YYYY-MM-DD) the claim appeared, when informed. */
  readonly claimDate: string | null
  /** ISO date (YYYY-MM-DD) the check was published; null renders "data não informada". */
  readonly reviewDate: string | null
  /** Canonical URL of the check on the checker's site. */
  readonly reviewUrl: string
  /** Title of the check, when published. */
  readonly headline: string | null
  /** The checker's own rating, verbatim (`reviewRating.alternateName`). */
  readonly textualRating: string
  /** Stamp derived only through `normalizeRating`. */
  readonly verdict: Verdict
  /** `RATING_MAP_VERSION` used to derive `verdict`. */
  readonly ratingMapVersion: number
  /** Wayback snapshot URL when the source is an archive copy; null otherwise. */
  readonly archivedUrl: string | null
  readonly provenance: Provenance
}

/** A fact-checking agency covered by the Carimbo. */
export interface FactChecker {
  /** URL-safe slug, e.g. `aos-fatos`. */
  readonly id: string
  readonly name: string
  readonly homepage: string
  /** Official channel for submitting a rumour to this checker, when one exists. */
  readonly submitUrl: string | null
}

/** File written by the worker and read by the API (`data/reviews.json`). */
export interface ReviewStore {
  /** Bump when the shape of `Review` changes. */
  readonly schemaVersion: 1
  /** ISO instant of the last ingest run. */
  readonly generatedAt: string
  readonly reviews: readonly Review[]
}
