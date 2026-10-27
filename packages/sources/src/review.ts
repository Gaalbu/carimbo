import { createHash } from 'node:crypto'

import { normalizeRating, type Provenance, RATING_MAP_VERSION, type Review } from '@carimbo/core'

import type { ExtractedClaimReview } from './claimreview.js'

const REVIEW_ID_LENGTH = 16

export function sha256Hex(content: string | Uint8Array): string {
  return createHash('sha256').update(content).digest('hex')
}

/** Stable review id: first 16 hex chars of SHA-256 of the review URL. */
export function reviewIdFor(reviewUrl: string): string {
  return sha256Hex(reviewUrl).slice(0, REVIEW_ID_LENGTH)
}

export interface ReviewOrigin {
  readonly checkerId: string
  readonly provenance: Provenance
  /** Wayback snapshot URL when the page came from the Internet Archive. */
  readonly archivedUrl?: string | null
}

/**
 * Turns extracted fields into a `Review`. The stamp comes only from `normalizeRating`: an
 * unmapped label stays `unknown`, never a guess.
 */
export function buildReview(extracted: ExtractedClaimReview, origin: ReviewOrigin): Review {
  return {
    id: reviewIdFor(extracted.reviewUrl),
    checkerId: origin.checkerId,
    claimText: extracted.claimText,
    claimant: extracted.claimant,
    claimDate: extracted.claimDate,
    reviewDate: extracted.reviewDate,
    reviewUrl: extracted.reviewUrl,
    headline: extracted.headline,
    textualRating: extracted.textualRating,
    verdict: normalizeRating(extracted.textualRating),
    ratingMapVersion: RATING_MAP_VERSION,
    archivedUrl: origin.archivedUrl ?? null,
    provenance: origin.provenance,
  }
}
