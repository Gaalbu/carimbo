import {
  compareNewestFirst,
  createSearchIndex,
  dedupeReviews,
  groupReviews,
  type ClaimSummary,
  type Review,
  type ReviewStore,
  type SearchIndex,
} from '@carimbo/core'

/** Everything the routes need, derived once per version of the store file. */
export interface StoreSnapshot {
  /** `ReviewStore.generatedAt`, or null when no store file exists yet. */
  readonly generatedAt: string | null
  /** Unique by `reviewUrl`. */
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
