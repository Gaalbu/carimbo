import type { ClaimSummary } from './api-contract.js'
import type { Review } from './review.js'
import { claimSlug } from './slug.js'
import { tagThemes } from './themes.js'
import { foldText, isNearWord, jaccard, STOPWORDS, tokenize, trigrams } from './text.js'

/**
 * Two claims with different canonical text join the same group only when the Jaccard index of
 * their trigrams (as in `pg_trgm`'s `similarity()`) reaches this value AND every meaningful word
 * of each appears in the other (typos and inflections allowed), with the same numbers and the
 * same negation. Measured on real-looking pairs: rewordings such as "não irá" / "não vai" score
 * 0.88, but a long sentence with one name swapped ("Lula passou mal…" / "Bolsonaro passou mal…")
 * still scores 0.81, which is why the word gate exists. Wrongly merging two claims would put a
 * checker's stamp on a claim it never checked, so a missed merge is the cheaper mistake: the page
 * still lists the other group as related.
 */
export const GROUPING_SIMILARITY_THRESHOLD = 0.8

/** Groups at or above this similarity (and below the grouping threshold) are shown as related. */
export const RELATED_SIMILARITY_THRESHOLD = 0.35

const MAX_RELATED = 5
const DIGITS = /^\d+$/
const NEGATIONS: ReadonlySet<string> = new Set([
  'nao',
  'nunca',
  'jamais',
  'nem',
  'nenhum',
  'nenhuma',
])

interface ClaimKey {
  readonly canonical: string
  readonly grams: ReadonlySet<string>
  /** Meaningful words, compared one by one after the trigram filter. */
  readonly content: readonly string[]
  /** Numbers and negations must match exactly: "3 mil" vs "30 mil", "é" vs "não é". */
  readonly guard: string
}

interface Candidate extends ClaimKey {
  readonly review: Review
}

function guardOf(tokens: readonly string[]): string {
  const numbers = tokens.filter((token) => DIGITS.test(token)).sort()
  const negated = tokens.some((token) => NEGATIONS.has(token))
  return `${negated ? 'neg' : 'pos'}|${numbers.join(',')}`
}

function claimKey(claimText: string): ClaimKey {
  const tokens = tokenize(claimText)
  return {
    canonical: foldText(claimText),
    grams: trigrams(claimText),
    content: [...new Set(tokens.filter((token) => !STOPWORDS.has(token)))],
    guard: guardOf(tokens),
  }
}

function coveredBy(words: readonly string[], other: readonly string[]): boolean {
  return words.every((word) => other.some((candidate) => isNearWord(word, candidate)))
}

/**
 * Second gate after the trigram threshold: every meaningful word on each side must appear on the
 * other, allowing typos and inflections. Long sentences that differ in a single name ("Lula" /
 * "Bolsonaro") still score above 0.8 in trigrams, and this is what keeps them apart.
 */
function sameWords(a: ClaimKey, b: ClaimKey): boolean {
  return coveredBy(a.content, b.content) && coveredBy(b.content, a.content)
}

/**
 * Same `id` is the same review: keep the most recently fetched copy. One page may hold several
 * reviews (one URL, different claims), each with its own id.
 */
export function dedupeReviews(reviews: readonly Review[]): Review[] {
  const byId = new Map<string, Review>()
  for (const review of reviews) {
    const current = byId.get(review.id)
    if (current === undefined || review.provenance.fetchedAt > current.provenance.fetchedAt) {
      byId.set(review.id, review)
    }
  }
  return [...byId.values()]
}

/** Whether two claim texts are similar enough to be grouped as the same claim. */
export function isSameClaim(a: string, b: string): boolean {
  const keyA = claimKey(a)
  const keyB = claimKey(b)
  if (keyA.canonical === keyB.canonical) return true
  if (keyA.guard !== keyB.guard) return false
  return jaccard(keyA.grams, keyB.grams) >= GROUPING_SIMILARITY_THRESHOLD && sameWords(keyA, keyB)
}

class DisjointSet {
  private readonly parent: number[]

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, index) => index)
  }

  find(index: number): number {
    let root = index
    while (this.parent[root] !== root) root = this.parent[root] ?? root
    let node = index
    while (node !== root) {
      const next = this.parent[node] ?? root
      this.parent[node] = root
      node = next
    }
    return root
  }

  union(a: number, b: number): void {
    const rootA = this.find(a)
    const rootB = this.find(b)
    if (rootA !== rootB) this.parent[Math.max(rootA, rootB)] = Math.min(rootA, rootB)
  }
}

/** Earliest review first; undated reviews last; ties by id so the order is stable. */
export function compareReviews(a: Review, b: Review): number {
  if (a.reviewDate !== b.reviewDate) {
    if (a.reviewDate === null) return 1
    if (b.reviewDate === null) return -1
    return a.reviewDate < b.reviewDate ? -1 : 1
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

function summarize(reviews: Review[]): ClaimSummary {
  reviews.sort(compareReviews)
  const [first] = reviews
  if (first === undefined) throw new Error('A claim group needs at least one review')
  const dates = reviews.flatMap((review) => (review.reviewDate === null ? [] : [review.reviewDate]))
  return {
    slug: claimSlug(first.claimText, first.id),
    claimText: first.claimText,
    claimant:
      first.claimant ?? reviews.find((review) => review.claimant !== null)?.claimant ?? null,
    latestReviewDate: dates.length === 0 ? null : dates.reduce((a, b) => (a > b ? a : b)),
    themes: tagThemes(...reviews.flatMap((review) => [review.claimText, review.headline])),
    reviews,
  }
}

/**
 * Groups reviews of the same claim. A review URL appears once; reviews join a group when their
 * canonical claim text is identical or their trigram similarity reaches
 * `GROUPING_SIMILARITY_THRESHOLD` (with matching numbers and negation). Verdicts are never merged:
 * every review stays in `reviews`, side by side.
 */
export function groupReviews(reviews: readonly Review[]): ClaimSummary[] {
  const candidates: Candidate[] = dedupeReviews(reviews).map((review) => ({
    review,
    ...claimKey(review.claimText),
  }))
  const sets = new DisjointSet(candidates.length)
  const byCanonical = new Map<string, number>()
  // Inverted index from trigram to candidates, so only pairs sharing grams are compared.
  const postings = new Map<string, number[]>()

  candidates.forEach((candidate, index) => {
    const twin = byCanonical.get(candidate.canonical)
    if (twin !== undefined) {
      sets.union(twin, index)
      return
    }
    byCanonical.set(candidate.canonical, index)

    const shared = new Map<number, number>()
    for (const gram of candidate.grams) {
      const list = postings.get(gram)
      if (list === undefined) {
        postings.set(gram, [index])
        continue
      }
      for (const other of list) shared.set(other, (shared.get(other) ?? 0) + 1)
      list.push(index)
    }
    for (const [other, count] of shared) {
      const peer = candidates[other]
      if (peer?.guard !== candidate.guard) continue
      const similarity = count / (candidate.grams.size + peer.grams.size - count)
      if (similarity >= GROUPING_SIMILARITY_THRESHOLD && sameWords(peer, candidate)) {
        sets.union(other, index)
      }
    }
  })

  const groups = new Map<number, Review[]>()
  candidates.forEach((candidate, index) => {
    const root = sets.find(index)
    const members = groups.get(root)
    if (members === undefined) groups.set(root, [candidate.review])
    else members.push(candidate.review)
  })
  return [...groups.values()].map(summarize)
}

/** Feed order: most recent review first; groups with no date last; ties by slug. */
export function compareNewestFirst(a: ClaimSummary, b: ClaimSummary): number {
  if (a.latestReviewDate !== b.latestReviewDate) {
    if (a.latestReviewDate === null) return 1
    if (b.latestReviewDate === null) return -1
    return a.latestReviewDate > b.latestReviewDate ? -1 : 1
  }
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0
}

/** Groups that look like `group` but were not merged with it, most similar first. */
export function findRelated(
  group: ClaimSummary,
  groups: readonly ClaimSummary[],
  limit = MAX_RELATED,
): ClaimSummary[] {
  const target = trigrams(group.claimText)
  return groups
    .filter((other) => other.slug !== group.slug)
    .map((other) => ({ other, score: jaccard(target, trigrams(other.claimText)) }))
    .filter(({ score }) => score >= RELATED_SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score || compareNewestFirst(a.other, b.other))
    .slice(0, limit)
    .map(({ other }) => other)
}
