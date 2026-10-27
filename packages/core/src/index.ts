export type {
  CheckerWithCount,
  ClaimDetail,
  ClaimsQuery,
  ClaimSummary,
  CoverageResponse,
  CoverageRow,
  Election,
  Page,
  SearchResult,
  StatsResponse,
  ThemeWithCount,
  VerdictCounts,
} from './api-contract.js'
export {
  canonicalizeRating,
  normalizeRating,
  RATING_LISTS,
  RATING_MAP_VERSION,
} from './normalize-rating.js'
export { SOURCE_METHODS } from './review.js'
export type { FactChecker, Provenance, Review, ReviewStore, SourceMethod } from './review.js'
export { VERDICTS } from './verdict.js'
export type { KnownVerdict, Verdict } from './verdict.js'
export { CHECKER_IDS, FACT_CHECKERS, findChecker } from './checkers.js'
export {
  ELECTION_YEARS,
  ELECTIONS,
  electionForDate,
  findElection,
  isInCampaign,
} from './elections.js'
export type { ElectionPeriod } from './elections.js'
export { findTheme, tagThemes, THEME_SLUGS, THEMES } from './themes.js'
export type { Theme } from './themes.js'
export {
  compareNewestFirst,
  compareReviews,
  dedupeReviews,
  findRelated,
  GROUPING_SIMILARITY_THRESHOLD,
  groupReviews,
  isSameClaim,
  RELATED_SIMILARITY_THRESHOLD,
} from './grouping.js'
export { createSearchIndex, DEFAULT_MIN_SEARCH_SCORE, searchClaims } from './search.js'
export type { ScoredClaim, SearchIndex, SearchOptions } from './search.js'
export { claimSlug, slugify } from './slug.js'
export { foldText, tokenize, trigramSimilarity } from './text.js'
