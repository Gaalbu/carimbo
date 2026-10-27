/**
 * The stamp shown for a review. `unknown` is rendered as "VEJA A CHECAGEM": the rating exists but
 * is not (yet) in the normalization map.
 */
export const VERDICTS = ['false', 'out_of_context', 'true', 'unknown'] as const

export type Verdict = (typeof VERDICTS)[number]

export type KnownVerdict = Exclude<Verdict, 'unknown'>
