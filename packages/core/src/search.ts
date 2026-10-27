import type { ClaimSummary } from './api-contract.js'
import { compareNewestFirst } from './grouping.js'
import { editDistance, STOPWORDS, tokenize, trigramCoverage, trigrams, typoBudget } from './text.js'

/** Results scoring below this are noise: a shared word or two, not the same rumour. */
export const DEFAULT_MIN_SEARCH_SCORE = 0.35
const DEFAULT_SEARCH_LIMIT = 20

const TOKEN_WEIGHT = 0.6
const TRIGRAM_WEIGHT = 0.4
/** Who said it matters less than what was said. */
const CLAIMANT_WEIGHT = 0.8
const EXACT_MATCH = 1
const PREFIX_MATCH = 0.9
const TYPO_MATCH = 0.8
const MIN_PREFIX_LENGTH = 4

interface IndexedField {
  readonly tokens: readonly string[]
  readonly grams: ReadonlySet<string>
  readonly weight: number
}

interface IndexedClaim {
  readonly claim: ClaimSummary
  readonly fields: readonly IndexedField[]
}

export interface SearchOptions {
  readonly limit?: number
  readonly minScore?: number
}

export type ScoredClaim = ClaimSummary & { readonly score: number }

function indexField(text: string, weight: number): IndexedField {
  return { tokens: [...new Set(tokenize(text))], grams: trigrams(text), weight }
}

function indexClaim(claim: ClaimSummary): IndexedClaim {
  const fields: IndexedField[] = []
  for (const review of claim.reviews) {
    fields.push(indexField(review.claimText, 1))
    if (review.headline !== null) fields.push(indexField(review.headline, 1))
    if (review.claimant !== null) fields.push(indexField(review.claimant, CLAIMANT_WEIGHT))
  }
  return { claim, fields }
}

function tokenMatch(queryToken: string, docTokens: readonly string[]): number {
  let best = 0
  const budget = typoBudget(queryToken.length)
  for (const docToken of docTokens) {
    if (docToken === queryToken) return EXACT_MATCH
    if (queryToken.length >= MIN_PREFIX_LENGTH && docToken.startsWith(queryToken)) {
      best = Math.max(best, PREFIX_MATCH)
    } else if (budget > 0 && editDistance(queryToken, docToken, budget) <= budget) {
      best = Math.max(best, TYPO_MATCH)
    }
  }
  return best
}

function scoreField(
  queryTokens: readonly string[],
  queryGrams: ReadonlySet<string>,
  field: IndexedField,
): number {
  const tokenScore =
    queryTokens.reduce((sum, token) => sum + tokenMatch(token, field.tokens), 0) /
    queryTokens.length
  const gramScore = trigramCoverage(queryGrams, field.grams)
  return field.weight * (TOKEN_WEIGHT * tokenScore + TRIGRAM_WEIGHT * gramScore)
}

function meaningfulTokens(query: string): string[] {
  const tokens = [...new Set(tokenize(query))]
  const content = tokens.filter((token) => !STOPWORDS.has(token))
  return content.length > 0 ? content : tokens
}

export interface SearchIndex {
  search(query: string, options?: SearchOptions): ScoredClaim[]
}

/**
 * Portuguese search over claim text, headline and claimant, accent-insensitive and tolerant to
 * typos. Each field scores 0.6 × the share of query words found in it (exact, as a prefix, or
 * within a small edit distance) plus 0.4 × the share of query trigrams found in it; a claim takes
 * the score of its best field. Scores range 0..1.
 */
export function createSearchIndex(claims: readonly ClaimSummary[]): SearchIndex {
  const indexed = claims.map(indexClaim)
  return {
    search(query, options = {}) {
      const queryTokens = meaningfulTokens(query)
      if (queryTokens.length === 0) return []
      const queryGrams = trigrams(queryTokens.join(' '))
      const minScore = options.minScore ?? DEFAULT_MIN_SEARCH_SCORE
      return indexed
        .map(({ claim, fields }) => ({
          claim,
          score: Math.max(0, ...fields.map((field) => scoreField(queryTokens, queryGrams, field))),
        }))
        .filter(({ score }) => score >= minScore)
        .sort((a, b) => b.score - a.score || compareNewestFirst(a.claim, b.claim))
        .slice(0, options.limit ?? DEFAULT_SEARCH_LIMIT)
        .map(({ claim, score }) => ({ ...claim, score: Math.round(score * 1000) / 1000 }))
    },
  }
}

export function searchClaims(
  claims: readonly ClaimSummary[],
  query: string,
  options?: SearchOptions,
): ScoredClaim[] {
  return createSearchIndex(claims).search(query, options)
}
