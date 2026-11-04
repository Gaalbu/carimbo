import { describe, expect, it } from 'vitest'
import type { Review } from '@carimbo/core'

import { recordRatingChanges } from '../src/rating-history.js'

function review(rating: string, fetchedAt: string): Review {
  return {
    id: 'review-1',
    checkerId: 'comprova',
    claimText: 'Uma alegação',
    claimant: null,
    claimDate: null,
    reviewDate: '2022-10-01',
    reviewUrl: 'https://example.org/review',
    headline: null,
    textualRating: rating,
    verdict: 'unknown',
    ratingMapVersion: 3,
    archivedUrl: null,
    provenance: {
      sourceUrl: 'https://example.org/review',
      fetchedAt,
      method: 'claimreview',
      parserVersion: 'claimreview@1',
      rawSha256: 'a'.repeat(64),
    },
  }
}

describe('rating history', () => {
  it('retains both original ratings and their provenance and does not duplicate a repeated change', () => {
    const before = review('Falso', '2022-10-01T12:00:00Z')
    const after = review('Enganoso', '2022-10-02T12:00:00Z')
    const recorded = recordRatingChanges([], [{ before, after }])
    expect(recorded).toEqual([{ before, after }])
    expect(recordRatingChanges(recorded, [{ before, after }])).toEqual(recorded)
  })

  it('preserves later reversals as separate changes', () => {
    const before = review('Falso', '2022-10-01T12:00:00Z')
    const after = review('Enganoso', '2022-10-02T12:00:00Z')
    const reversal = review('Falso', '2022-10-03T12:00:00Z')
    expect(
      recordRatingChanges(
        [],
        [
          { before, after },
          { before: after, after: reversal },
        ],
      ),
    ).toHaveLength(2)
  })
})
