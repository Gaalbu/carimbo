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

function identityKey(review: Review): string {
  return JSON.stringify([review.checkerId, review.reviewUrl, review.claimText])
}

function reviewFields(review: Review): string {
  const { provenance } = review
  return JSON.stringify([
    review.checkerId,
    review.reviewUrl,
    review.claimText,
    review.claimant,
    review.claimDate,
    review.reviewDate,
    review.headline,
    review.textualRating,
    review.verdict,
    review.ratingMapVersion,
    review.archivedUrl,
    provenance.sourceUrl,
    provenance.fetchedAt,
    provenance.method,
    provenance.parserVersion,
    provenance.rawSha256,
  ])
}

/**
 * Reconcile a complete incoming batch against the complete stored set before deduplication by id.
 * Matches require identical checker, URL and claim text. Conflicting duplicates, ambiguous stored
 * identities and id collisions throw; callers must not persist a partial result. Text edits require
 * explicit reconciliation, since similarity cannot establish identity. Unmatched stored reviews
 * are not returned and must be retained by the caller.
 *
 * Integration requires exporting this function from the package and changing the worker to call it
 * before its URL/order-based deduplication, then atomically merge by id. Preserve stored ids and
 * references; resolve conflicts and text edits manually. The current worker does not call it.
 */
export function reconcileReviewIdentities(
  incoming: readonly Review[],
  existing: readonly Review[],
): Review[] {
  const storedByKey = new Map<string, string>()
  const keysById = new Map<string, string>()
  for (const review of existing) {
    const key = identityKey(review)
    const storedId = storedByKey.get(key)
    if (storedId !== undefined && storedId !== review.id) {
      throw new Error('Ambiguous stored review identity')
    }
    const storedKey = keysById.get(review.id)
    if (storedKey !== undefined && storedKey !== key) throw new Error('Stored review id collision')
    storedByKey.set(key, review.id)
    keysById.set(review.id, key)
  }

  const results = new Map<string, Review>()
  for (const review of incoming) {
    const key = identityKey(review)
    const previous = results.get(key)
    if (previous !== undefined) {
      if (reviewFields(previous) !== reviewFields(review)) {
        throw new Error('Conflicting incoming reviews for the same identity')
      }
      continue
    }
    const id =
      storedByKey.get(key) ?? sha256Hex(`review-identity-v2:${key}`).slice(0, REVIEW_ID_LENGTH)
    const idKey = keysById.get(id)
    if (idKey !== undefined && idKey !== key) throw new Error('Review id collision')
    keysById.set(id, key)
    results.set(key, { ...review, id })
  }
  return [...results.values()]
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
