import type { KnownVerdict, Verdict } from './verdict.js'

/**
 * Bump on any change to the lists below, so reviews stored with an older map can be found and
 * normalized again. History and sources: docs/spikes/S3-vocabulario.md.
 */
export const RATING_MAP_VERSION = 2

const FALSE_RATINGS = ['falso', 'falsa', 'fake', 'montagem', 'inventado', 'inventada'] as const

const OUT_OF_CONTEXT_RATINGS = [
  'enganoso',
  'enganosa',
  'sem contexto',
  'falta contexto',
  'fora de contexto',
  'distorcido',
  'distorcida',
  'exagerado',
  'exagerada',
  'impreciso',
  'imprecisa',
] as const

const TRUE_RATINGS = [
  'verdadeiro',
  'verdadeira',
  'verdade',
  'correto',
  'correta',
  'comprovado',
  'comprovada',
] as const

/** The map as lists per stamp, for display (e.g. the methodology page). Same source as the map. */
export const RATING_LISTS: Readonly<Record<KnownVerdict, readonly string[]>> = {
  false: FALSE_RATINGS,
  out_of_context: OUT_OF_CONTEXT_RATINGS,
  true: TRUE_RATINGS,
}

// Comprova appends its explanation to the label ("Falso: O aviso de ... foi implementado ..."),
// so only the text before the first colon is the rating.
const EXPLANATION_SEPARATOR = ':'
const COMBINING_MARKS = /\p{M}/gu
const NON_ALPHANUMERIC_RUNS = /[^a-z0-9]+/g

const RATING_MAP: ReadonlyMap<string, KnownVerdict> = new Map([
  ...toEntries(FALSE_RATINGS, 'false'),
  ...toEntries(OUT_OF_CONTEXT_RATINGS, 'out_of_context'),
  ...toEntries(TRUE_RATINGS, 'true'),
])

function toEntries(
  ratings: readonly string[],
  verdict: KnownVerdict,
): (readonly [string, KnownVerdict])[] {
  return ratings.map((rating) => [rating, verdict] as const)
}

/**
 * Reduces a checker's label to the key used by the map: label before the explanation, no
 * accents, lower case, punctuation (including g1's `#`) collapsed to single spaces.
 */
export function canonicalizeRating(textualRating: string): string {
  const [label = ''] = textualRating.split(EXPLANATION_SEPARATOR, 1)
  return label
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_RUNS, ' ')
    .trim()
}

/**
 * Maps a checker's original rating to a stamp. Only exact map entries count: anything else is
 * `unknown`, never a best guess, because the Carimbo must not put words in a checker's mouth.
 */
export function normalizeRating(textualRating: string): Verdict {
  return RATING_MAP.get(canonicalizeRating(textualRating)) ?? 'unknown'
}
