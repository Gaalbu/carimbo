import { RATING_MAP_VERSION } from '@carimbo/core'
import { describe, expect, it } from 'vitest'

import { buildReview, extractClaimReviews, reviewIdFor, sha256Hex } from '../src/index.js'
import { fixture, pageWith } from './helpers.js'

const PROVENANCE = {
  sourceUrl: 'https://projetocomprova.com.br/',
  fetchedAt: '2026-10-26T12:00:00.000Z',
  method: 'claimreview',
  parserVersion: 'claimreview@1',
  rawSha256: sha256Hex('raw'),
} as const

describe('buildReview', () => {
  it('derives the stamp only through normalizeRating, keeping the label verbatim', () => {
    const [extracted] = extractClaimReviews(
      pageWith(fixture('comprova-claimreview-rating-with-explanation.json')),
      'https://projetocomprova.com.br/',
    ).reviews
    if (extracted === undefined) throw new Error('fixture sem ClaimReview')

    const review = buildReview(extracted, { checkerId: 'comprova', provenance: PROVENANCE })

    expect(review.verdict).toBe('false')
    expect(review.textualRating).toMatch(/^Falso: O aviso/)
    expect(review.ratingMapVersion).toBe(RATING_MAP_VERSION)
    expect(review.id).toBe(reviewIdFor(extracted.reviewUrl))
    expect(review.archivedUrl).toBeNull()
    expect(review.provenance).toEqual(PROVENANCE)
  })

  it('leaves an unmapped label as unknown', () => {
    const review = buildReview(
      {
        claimText: 'Alegação',
        claimant: null,
        claimDate: null,
        reviewDate: null,
        reviewUrl: 'https://example.org/a',
        headline: null,
        textualRating: 'subestimado',
        ratingValue: null,
      },
      { checkerId: 'aos-fatos', provenance: PROVENANCE },
    )

    expect(review.verdict).toBe('unknown')
  })
})

describe('reviewIdFor', () => {
  it('is the first 16 hex chars of the SHA-256 of the URL', () => {
    expect(reviewIdFor('https://example.org/a')).toBe(
      sha256Hex('https://example.org/a').slice(0, 16),
    )
    expect(reviewIdFor('https://example.org/a')).toMatch(/^[0-9a-f]{16}$/)
  })
})
