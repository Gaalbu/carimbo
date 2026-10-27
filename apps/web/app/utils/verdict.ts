import type { Verdict, VerdictCounts } from '@carimbo/core'

/** Display order everywhere: the stamps that matter most first. */
export const VERDICT_ORDER: readonly Verdict[] = ['false', 'out_of_context', 'true', 'unknown']

/** The word printed on the stamp. A stamp is never colour alone (docs/PLANO.md §4.4, regra 5). */
export const VERDICT_LABEL: Readonly<Record<Verdict, string>> = {
  false: 'Falso',
  out_of_context: 'Fora de contexto',
  true: 'Verdadeiro',
  unknown: 'Veja a checagem',
}

/** Singular/plural used in the scoreboard headline ("14 falsos, 5 fora de contexto"). */
const VERDICT_COUNT_WORDS: Readonly<Record<Verdict, readonly [string, string]>> = {
  false: ['falso', 'falsos'],
  out_of_context: ['fora de contexto', 'fora de contexto'],
  true: ['verdadeiro', 'verdadeiros'],
  unknown: ['com outra avaliação', 'com outra avaliação'],
}

/** Portuguese URL values for the `carimbo` query param. */
export const VERDICT_PARAM: Readonly<Record<Verdict, string>> = {
  false: 'falso',
  out_of_context: 'contexto',
  true: 'verdadeiro',
  unknown: 'outro',
}

/** Keyboard shortcuts F/C/V (docs/PLANO.md §5). */
export const VERDICT_SHORTCUT: Readonly<Record<string, Verdict>> = {
  f: 'false',
  c: 'out_of_context',
  v: 'true',
}

export function verdictFromParam(value: unknown): Verdict | undefined {
  if (typeof value !== 'string') return undefined
  return VERDICT_ORDER.find((verdict) => VERDICT_PARAM[verdict] === value)
}

export function countPhrase(verdict: Verdict, count: number): string {
  const [one, many] = VERDICT_COUNT_WORDS[verdict]
  return `${count.toLocaleString('pt-BR')} ${count === 1 ? one : many}`
}

/** "14 falsos, 5 fora de contexto e 2 verdadeiros"; zero counts are left out. */
export function countsSentence(counts: VerdictCounts): string {
  const parts = VERDICT_ORDER.filter((verdict) => counts[verdict] > 0).map((verdict) =>
    countPhrase(verdict, counts[verdict]),
  )
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`
}

/** Distinct verdicts of a group in display order, never merged into one. */
export function distinctVerdicts(verdicts: readonly Verdict[]): Verdict[] {
  return VERDICT_ORDER.filter((verdict) => verdicts.includes(verdict))
}
