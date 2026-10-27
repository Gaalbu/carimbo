import { z } from 'zod'

import { hasType, type JsonLdNode, nodeTypes, scanJsonLd } from './jsonld.js'

/** Bump when the extraction rules below change, so stored reviews can be told apart. */
export const CLAIMREVIEW_PARSER_VERSION = 'claimreview@1'

/** The structured fields of one `ClaimReview`, before it becomes a `Review`. */
export interface ExtractedClaimReview {
  readonly claimText: string
  readonly claimant: string | null
  /** YYYY-MM-DD, as written by the checker. */
  readonly claimDate: string | null
  /** YYYY-MM-DD; from the ClaimReview, else from the page's only Article. Never the fetch date. */
  readonly reviewDate: string | null
  /** Absolute URL of the check. */
  readonly reviewUrl: string
  readonly headline: string | null
  /** Verbatim label, including any explanation glued to it (Comprova's "Falso: …"). */
  readonly textualRating: string
  /** Numeric position on the checker's own scale, kept as text; it does not drive the stamp. */
  readonly ratingValue: string | null
}

export interface ClaimReviewExtraction {
  readonly reviews: readonly ExtractedClaimReview[]
  /** Blocks or ClaimReview nodes that could not be used, in Portuguese for the worker log. */
  readonly errors: readonly string[]
}

const CLAIM_REVIEW_TYPE = 'ClaimReview'
// The schema.org Article family whose datePublished may stand in for a missing review date.
const ARTICLE_TYPES: ReadonlySet<string> = new Set([
  'Article',
  'NewsArticle',
  'ReportageNewsArticle',
  'AnalysisNewsArticle',
  'BackgroundNewsArticle',
  'OpinionNewsArticle',
])
const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/

const nonEmptyText = z.string().trim().min(1)
const textOrNumber = z.union([z.string(), z.number()]).transform(String)

const namedEntity = z.union([nonEmptyText, z.object({ name: z.string().optional() })])
const authorSchema = z.union([namedEntity, z.array(namedEntity)])

const ratingSchema = z.object({
  alternateName: z.string().optional(),
  name: z.string().optional(),
  ratingValue: textOrNumber.optional(),
})

const claimReviewSchema = z.object({
  claimReviewed: nonEmptyText,
  url: z.string().optional(),
  datePublished: z.string().optional(),
  headline: z.string().optional(),
  name: z.string().optional(),
  reviewRating: z.union([ratingSchema, z.array(ratingSchema).min(1)]),
  itemReviewed: z
    .object({
      datePublished: z.string().optional(),
      author: authorSchema.optional(),
    })
    .optional(),
})

const articleSchema = z.object({
  datePublished: z.string().optional(),
  headline: z.string().optional(),
})

type ClaimReviewNode = z.infer<typeof claimReviewSchema>

/**
 * Extracts every `ClaimReview` from the JSON-LD of a checker's page. Only structured fields are
 * read; the article text is never touched. Nodes that fail validation are reported, not guessed.
 */
export function extractClaimReviews(html: string, pageUrl: string): ClaimReviewExtraction {
  const scan = scanJsonLd(html)
  const errors = [...scan.errors]
  const article = soleArticle(scan.nodes)
  const reviews: ExtractedClaimReview[] = []

  for (const node of scan.nodes) {
    if (!hasType(node, CLAIM_REVIEW_TYPE)) continue
    const parsed = claimReviewSchema.safeParse(node)
    if (!parsed.success) {
      errors.push(`ClaimReview fora do formato: ${z.prettifyError(parsed.error)}`)
      continue
    }
    const review = toExtracted(parsed.data, pageUrl, article)
    if (typeof review === 'string') errors.push(review)
    else reviews.push(review)
  }
  return { reviews, errors }
}

interface ArticleFacts {
  readonly date: string | null
  readonly headline: string | null
}

/** Date and headline of the page's Article, only when the page has exactly one candidate. */
function soleArticle(nodes: readonly JsonLdNode[]): ArticleFacts {
  const articles = nodes
    .filter((node) => nodeTypes(node).some((type) => ARTICLE_TYPES.has(type)))
    .map((node) => articleSchema.safeParse(node))
    .flatMap((parsed) => (parsed.success ? [parsed.data] : []))
  const dates = new Set(articles.map((article) => isoDate(article.datePublished)))
  dates.delete(null)
  const headlines = new Set(articles.map((article) => cleanText(article.headline)))
  headlines.delete(null)
  return {
    date: dates.size === 1 ? ([...dates][0] ?? null) : null,
    headline: headlines.size === 1 ? ([...headlines][0] ?? null) : null,
  }
}

function toExtracted(
  node: ClaimReviewNode,
  pageUrl: string,
  article: ArticleFacts,
): ExtractedClaimReview | string {
  const rating = Array.isArray(node.reviewRating) ? node.reviewRating[0] : node.reviewRating
  const textualRating = cleanText(rating?.alternateName) ?? cleanText(rating?.name)
  if (textualRating === null) return `ClaimReview sem avaliação textual em ${pageUrl}`

  let reviewUrl: string
  try {
    reviewUrl = new URL(cleanText(node.url) ?? pageUrl, pageUrl).href
  } catch {
    return `ClaimReview com url inválida (${String(node.url)}) em ${pageUrl}`
  }

  return {
    claimText: node.claimReviewed,
    claimant: firstName(node.itemReviewed?.author),
    claimDate: isoDate(node.itemReviewed?.datePublished),
    reviewDate: isoDate(node.datePublished) ?? article.date,
    reviewUrl,
    headline: cleanText(node.headline) ?? cleanText(node.name) ?? article.headline,
    textualRating,
    ratingValue: cleanText(rating?.ratingValue),
  }
}

function firstName(author: z.infer<typeof authorSchema> | undefined): string | null {
  const entities = author === undefined ? [] : Array.isArray(author) ? author : [author]
  for (const entity of entities) {
    const name = cleanText(typeof entity === 'string' ? entity : entity.name)
    if (name !== null) return name
  }
  return null
}

function cleanText(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

/**
 * Calendar date as written by the publisher (`2026-10-26T15:29:46-03:00` → `2026-10-26`), so the
 * date is the one the checker printed, not a timezone conversion of it.
 */
export function isoDate(value: string | undefined): string | null {
  const match = ISO_DATE_PREFIX.exec(value?.trim() ?? '')
  if (match === null) return null
  const [date, year, month, day] = match
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  const roundTrip = parsed.toISOString().slice(0, date.length)
  return roundTrip === date ? date : null
}
