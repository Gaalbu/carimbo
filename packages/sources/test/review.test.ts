import { RATING_MAP_VERSION } from '@carimbo/core'
import { describe, expect, it } from 'vitest'

import { buildReview, extractClaimReviews, reviewIdFor, sha256Hex } from '../src/index.js'
import { reconcileReviewIdentities } from '../src/review.js'
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

describe('reconcileReviewIdentities', () => {
  const make = (claimText: string, sharedUrl = false) =>
    buildReview(
      {
        claimText,
        claimant: null,
        claimDate: null,
        reviewDate: null,
        reviewUrl: 'https://example.org/a',
        headline: null,
        textualRating: 'Falso',
        ratingValue: null,
      },
      { checkerId: 'comprova', provenance: PROVENANCE, sharedUrl },
    )

  it('preserves legacy associations across reordering and repeated reconciliation', () => {
    const existing = [make('A'), make('B', true)]
    const reordered = [make('B'), make('A', true)]
    const once = reconcileReviewIdentities(reordered, existing)
    expect(once.map(({ claimText, id }) => [claimText, id])).toEqual([
      ['B', existing[1]?.id],
      ['A', existing[0]?.id],
    ])
    expect(reconcileReviewIdentities(reordered, once)).toEqual(once)
  })

  it('assigns deterministic distinct ids to new claims regardless of order and removes exact repeats', () => {
    const a = make('A')
    const b = make('B')
    const forward = reconcileReviewIdentities([a, b, a], [])
    const reverse = reconcileReviewIdentities([b, a], [])
    expect(forward).toHaveLength(2)
    expect(new Set(forward.map((review) => review.id)).size).toBe(2)
    expect(Object.fromEntries(forward.map((r) => [r.claimText, r.id]))).toEqual(
      Object.fromEntries(reverse.map((r) => [r.claimText, r.id])),
    )
  })

  it('rejects ambiguous legacy matches and conflicting duplicates', () => {
    const a = make('A')
    expect(() => reconcileReviewIdentities([a], [a, { ...a, id: 'other' }])).toThrow()
    expect(() => reconcileReviewIdentities([a, { ...a, textualRating: 'Outro' }], [])).toThrow()
    expect(() => reconcileReviewIdentities([], [a, { ...make('B'), id: a.id }])).toThrow()
  })

  it('separates checkers and rejects a generated id already owned by another identity', () => {
    const a = make('A')
    const anotherChecker = { ...a, checkerId: 'aos-fatos' }
    const reviews = reconcileReviewIdentities([a, anotherChecker], [])
    const first = reviews[0]
    if (first === undefined) throw new Error('missing reconciled review')
    expect(reviews[0]?.id).not.toBe(reviews[1]?.id)
    expect(reconcileReviewIdentities([a, anotherChecker], reviews)).toEqual(reviews)
    expect(() => reconcileReviewIdentities([a], [{ ...make('B'), id: first.id }])).toThrow()
  })

  it('does not guess that a materially edited claim is the old claim', () => {
    const old = make('Alegação original')
    const [updated] = reconcileReviewIdentities([make('Alegação alterada')], [old])
    expect(updated?.id).not.toBe(old.id)
  })
})
