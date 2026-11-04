import type { Review } from '@carimbo/core'

/** Original and replacement records include their independently captured provenance. */
export interface RatingChange {
  readonly before: Review
  readonly after: Review
}

/** Idempotently adds changes to history while preserving successive reversals. */
export function recordRatingChanges(
  existing: readonly RatingChange[],
  incoming: readonly RatingChange[],
): RatingChange[] {
  const result = [...existing]
  const keys = new Set(existing.map(changeKey))
  for (const change of incoming) {
    const key = changeKey(change)
    if (!keys.has(key)) {
      keys.add(key)
      result.push(change)
    }
  }
  return result
}

function changeKey(change: RatingChange): string {
  return JSON.stringify([
    change.after.id,
    change.before.textualRating,
    change.after.textualRating,
    change.after.provenance.fetchedAt,
    change.after.provenance.rawSha256,
  ])
}
