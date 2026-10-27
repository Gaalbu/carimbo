const COMBINING_MARKS = /\p{M}/gu
const NON_ALPHANUMERIC_RUNS = /[^a-z0-9]+/g

/**
 * Reduces free text to the form every comparison in the Carimbo uses: no accents, lower case,
 * anything that is not a letter or digit collapsed to single spaces.
 */
export function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_RUNS, ' ')
    .trim()
}

export function tokenize(text: string): string[] {
  const folded = foldText(text)
  return folded === '' ? [] : folded.split(' ')
}

/**
 * Trigrams in the style of PostgreSQL `pg_trgm`: each word is padded with two spaces in front and
 * one behind, so short words and word starts still produce grams.
 */
export function trigrams(text: string): Set<string> {
  const grams = new Set<string>()
  for (const token of tokenize(text)) {
    const padded = `  ${token} `
    for (let index = 0; index + 3 <= padded.length; index += 1) {
      grams.add(padded.slice(index, index + 3))
    }
  }
  return grams
}

function intersectionSize(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a]
  let shared = 0
  for (const gram of small) {
    if (large.has(gram)) shared += 1
  }
  return shared
}

/** Jaccard index of two trigram sets, like `pg_trgm`'s `similarity()`. */
export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) return 0
  const shared = intersectionSize(a, b)
  return shared / (a.size + b.size - shared)
}

export function trigramSimilarity(a: string, b: string): number {
  return jaccard(trigrams(a), trigrams(b))
}

/** Share of `query`'s trigrams found in `text`: high when the query is contained in the text. */
export function trigramCoverage(query: ReadonlySet<string>, text: ReadonlySet<string>): number {
  return query.size === 0 ? 0 : intersectionSize(query, text) / query.size
}

/** Classic Levenshtein distance, stopping early once `max` is exceeded. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const value = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      )
      current.push(value)
      rowMin = Math.min(rowMin, value)
    }
    if (rowMin > max) return max + 1
    previous = current
  }
  return previous[b.length] ?? max + 1
}

/**
 * Function words and auxiliary verbs that carry no meaning when telling two rumours apart (folded,
 * no accents). Negations are deliberately absent: "é" and "não é" are different claims.
 */
export const STOPWORDS: ReadonlySet<string> = new Set(
  (
    'a o e as os de da do das dos em no na nos nas um uma uns umas para pra por pelo pela pelos ' +
    'pelas com que se ao aos sua seu suas seus ou mas foi ser sao esta este isso isto essa ' +
    'esse ja muito mais como vai vao ira irao sera serao pode podem deve devem tem teve era estao'
  ).split(' '),
)

/** Typos tolerated in a word: none for short words, where one letter changes the meaning. */
export function typoBudget(length: number): number {
  if (length < 4) return 0
  return length < 8 ? 1 : 2
}

/** Same word, allowing a typo or an inflection (fraudada / fraudadas) on longer words. */
export function isNearWord(a: string, b: string): boolean {
  if (a === b) return true
  const budget = typoBudget(Math.min(a.length, b.length))
  return budget > 0 && editDistance(a, b, budget) <= budget
}
