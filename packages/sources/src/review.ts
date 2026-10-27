import { createHash } from 'node:crypto'

import { normalizeRating, type Provenance, RATING_MAP_VERSION, type Review } from '@carimbo/core'

import type { ExtractedClaimReview } from './claimreview.js'

const REVIEW_ID_LENGTH = 16

export function sha256Hex(content: string | Uint8Array): string {
  return createHash('sha256').update(content).digest('hex')
}

/**
 * Stable review id: first 16 hex chars of SHA-256 of the review URL. When one page carries
 * several ClaimReviews with the same URL, the extra ones also hash their claim text.
 */
export function reviewIdFor(reviewUrl: string, claimText?: string): string {
  const key = claimText === undefined ? reviewUrl : `${reviewUrl}\n${claimText}`
  return sha256Hex(key).slice(0, REVIEW_ID_LENGTH)
}

export interface ReviewOrigin {
  readonly checkerId: string
  readonly provenance: Provenance
  /** Wayback snapshot URL when the page came from the Internet Archive. */
  readonly archivedUrl?: string | null
  /** Set for the 2nd+ ClaimReview of a page that shares one URL (see `reviewIdFor`). */
  readonly sharedUrl?: boolean
}

/**
 * Turns extracted fields into a `Review`. The stamp comes only from `normalizeRating`: an
 * unmapped label stays `unknown`, never a guess.
 */
export function buildReview(extracted: ExtractedClaimReview, origin: ReviewOrigin): Review {
  return {
    id: origin.sharedUrl
      ? reviewIdFor(extracted.reviewUrl, extracted.claimText)
      : reviewIdFor(extracted.reviewUrl),
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
