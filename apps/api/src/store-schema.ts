import { SOURCE_METHODS, VERDICTS, type ReviewStore } from '@carimbo/core'
import { z } from 'zod'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const provenanceSchema = z.object({
  sourceUrl: z.string().min(1),
  fetchedAt: z.string().min(1),
  method: z.enum(SOURCE_METHODS),
  parserVersion: z.string().min(1),
  rawSha256: z.string().regex(/^[0-9a-f]{64}$/),
})

const reviewSchema = z.object({
  id: z.string().min(1),
  checkerId: z.string().min(1),
  claimText: z.string().min(1),
  claimant: z.string().nullable(),
  claimDate: isoDate.nullable(),
  reviewDate: isoDate.nullable(),
  reviewUrl: z.string().min(1),
  headline: z.string().nullable(),
  textualRating: z.string(),
  verdict: z.enum(VERDICTS),
  ratingMapVersion: z.number().int(),
  archivedUrl: z.string().nullable(),
  provenance: provenanceSchema,
})

/** Shape of `data/reviews.json`. A record without full provenance makes the whole file invalid. */
export const reviewStoreSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().min(1),
  reviews: z.array(reviewSchema),
})

export function parseReviewStore(json: unknown): ReviewStore {
  return reviewStoreSchema.parse(json)
}
