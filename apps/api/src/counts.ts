import { VERDICTS, type Review, type Verdict, type VerdictCounts } from '@carimbo/core'

export function countVerdicts(reviews: Iterable<Review>): VerdictCounts {
  const counts = Object.fromEntries(VERDICTS.map((verdict) => [verdict, 0])) as Record<
    Verdict,
    number
  >
  for (const review of reviews) counts[review.verdict] += 1
  return counts
}
