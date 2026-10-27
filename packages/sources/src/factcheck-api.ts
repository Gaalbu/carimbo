import { z } from 'zod'

import { isoDate, type ExtractedClaimReview } from './claimreview.js'
import { CARIMBO_USER_AGENT } from './http.js'

export const FACTCHECK_API_PARSER_VERSION = 'factcheck-api@1'
export const FACTCHECK_API_ENDPOINT = 'https://factchecktools.googleapis.com/v1alpha1/claims:search'

/** One review from the API, with the publisher the worker maps to a checker. */
export interface FactCheckApiReview extends ExtractedClaimReview {
  readonly publisherName: string | null
  /** Publisher site as the API reports it, e.g. `aosfatos.org`. */
  readonly publisherSite: string | null
}

export interface FactCheckSearchParams {
  /** Free text; the API needs this or `reviewPublisherSiteFilter`. */
  readonly query?: string
  readonly reviewPublisherSiteFilter?: string
  readonly maxAgeDays?: number
  readonly pageSize?: number
  readonly pageToken?: string
}

export interface FactCheckSearchPage {
  readonly reviews: readonly FactCheckApiReview[]
  readonly nextPageToken: string | null
  /** The raw JSON body, kept for `rawSha256` and the private raw store. */
  readonly raw: string
  readonly requestUrl: string
  readonly fetchedAt: string
}

export interface FactCheckClientOptions {
  readonly apiKey: string
  readonly fetch?: typeof fetch
  readonly now?: () => number
  readonly timeoutMs?: number
}

const LANGUAGE_CODE = 'pt'
const DEFAULT_TIMEOUT_MS = 30_000

const reviewSchema = z.object({
  publisher: z.object({ name: z.string().optional(), site: z.string().optional() }).optional(),
  url: z.string(),
  title: z.string().optional(),
  reviewDate: z.string().optional(),
  textualRating: z.string().trim().min(1),
  languageCode: z.string().optional(),
})

const responseSchema = z.object({
  claims: z
    .array(
      z.object({
        text: z.string().trim().min(1),
        claimant: z.string().optional(),
        claimDate: z.string().optional(),
        claimReview: z.array(reviewSchema).default([]),
      }),
    )
    .default([]),
  nextPageToken: z.string().optional(),
})

/**
 * Client for Google Fact Check Tools `claims:search` (v1alpha1), restricted to Portuguese. Only
 * used when the worker has `FACTCHECK_API_KEY`; the key goes in a header, never in the URL.
 */
export class FactCheckApiClient {
  private readonly apiKey: string
  private readonly fetchImpl: typeof fetch
  private readonly now: () => number
  private readonly timeoutMs: number

  constructor(options: FactCheckClientOptions) {
    this.apiKey = options.apiKey
    this.fetchImpl = options.fetch ?? fetch
    this.now = options.now ?? Date.now
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  async search(params: FactCheckSearchParams): Promise<FactCheckSearchPage> {
    const url = new URL(FACTCHECK_API_ENDPOINT)
    url.searchParams.set('languageCode', LANGUAGE_CODE)
    if (params.query !== undefined) url.searchParams.set('query', params.query)
    if (params.reviewPublisherSiteFilter !== undefined) {
      url.searchParams.set('reviewPublisherSiteFilter', params.reviewPublisherSiteFilter)
    }
    if (params.maxAgeDays !== undefined) {
      url.searchParams.set('maxAgeDays', String(params.maxAgeDays))
    }
    if (params.pageSize !== undefined) url.searchParams.set('pageSize', String(params.pageSize))
    if (params.pageToken !== undefined) url.searchParams.set('pageToken', params.pageToken)

    const response = await this.fetchImpl(url, {
      headers: { 'x-goog-api-key': this.apiKey, 'user-agent': CARIMBO_USER_AGENT },
      signal: AbortSignal.timeout(this.timeoutMs),
    })
    const raw = await response.text()
    if (!response.ok) {
      throw new Error(`Fact Check API respondeu HTTP ${String(response.status)}`)
    }
    const parsed = responseSchema.parse(JSON.parse(raw))
    return {
      reviews: parsed.claims.flatMap((claim) =>
        claim.claimReview.map((review) => toReview(claim, review)),
      ),
      nextPageToken: parsed.nextPageToken ?? null,
      raw,
      requestUrl: url.href,
      fetchedAt: new Date(this.now()).toISOString(),
    }
  }
}

type ApiClaim = z.infer<typeof responseSchema>['claims'][number]

function toReview(claim: ApiClaim, review: z.infer<typeof reviewSchema>): FactCheckApiReview {
  return {
    claimText: claim.text,
    claimant: blankToNull(claim.claimant),
    claimDate: isoDate(claim.claimDate),
    reviewDate: isoDate(review.reviewDate),
    reviewUrl: new URL(review.url).href,
    headline: blankToNull(review.title),
    textualRating: review.textualRating,
    ratingValue: null,
    publisherName: blankToNull(review.publisher?.name),
    publisherSite: blankToNull(review.publisher?.site),
  }
}

function blankToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}
