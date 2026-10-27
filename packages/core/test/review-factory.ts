import type { Review } from '../src/index.js'
import { normalizeRating, RATING_MAP_VERSION } from '../src/index.js'

let counter = 0

/** Synthetic review for unit tests. Never used outside test code. */
export function makeReview(overrides: Partial<Review> & Pick<Review, 'claimText'>): Review {
  counter += 1
  const id = overrides.id ?? counter.toString(16).padStart(16, '0')
  const textualRating = overrides.textualRating ?? 'Falso'
  return {
    id,
    checkerId: 'aos-fatos',
    claimant: null,
    claimDate: null,
    reviewDate: '2026-10-20',
    reviewUrl: `https://exemplo.invalid/checagem/${id}`,
    headline: null,
    textualRating,
    verdict: normalizeRating(textualRating),
    ratingMapVersion: RATING_MAP_VERSION,
    archivedUrl: null,
    provenance: {
      sourceUrl: `https://exemplo.invalid/checagem/${id}`,
      fetchedAt: '2026-10-26T12:00:00.000Z',
      method: 'claimreview',
      parserVersion: 'synthetic@test',
      rawSha256: '0'.repeat(64),
    },
    ...overrides,
  }
}
