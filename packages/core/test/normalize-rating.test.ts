import { describe, expect, it } from 'vitest'

import { canonicalizeRating, normalizeRating, type Verdict } from '../src/index.js'

interface RatingCase {
  readonly rating: string
  readonly expected: Verdict
  readonly origin: string
}

const COMPROVA_RATING_WITH_EXPLANATION =
  'Falso: O aviso de “Confira seu voto” foi implementado nas últimas eleições gerais para permitir que o eleitor revise o voto antes da confirmação.'

// Every rating string collected in spikes S2/S3 (26/10/2026). See docs/spikes/S3-vocabulario.md.
const OBSERVED_RATINGS: readonly RatingCase[] = [
  { rating: 'falso', expected: 'false', origin: 'Aos Fatos, ClaimReview' },
  { rating: 'Falso', expected: 'false', origin: 'Estadão Verifica e Comprova, ClaimReview' },
  { rating: 'Enganoso', expected: 'out_of_context', origin: 'Estadão Verifica, ClaimReview' },
  { rating: COMPROVA_RATING_WITH_EXPLANATION, expected: 'false', origin: 'Comprova, ClaimReview' },
  { rating: '#FAKE', expected: 'false', origin: 'g1 Fato ou Fake, selo no título' },
  { rating: '#FATO', expected: 'unknown', origin: 'g1, pendente de decisão (S3)' },
  { rating: '#NÃOÉBEMASSIM', expected: 'unknown', origin: 'g1, pendente de decisão (S3)' },
]

// Vocabulary from docs/PLANO.md §4.2, plus gender inflections and the stamp's own name.
const PLANNED_RATINGS: readonly RatingCase[] = [
  { rating: 'fake', expected: 'false', origin: 'plano' },
  { rating: 'montagem', expected: 'false', origin: 'plano' },
  { rating: 'inventado', expected: 'false', origin: 'plano' },
  { rating: 'falsa', expected: 'false', origin: 'flexão' },
  { rating: 'enganosa', expected: 'out_of_context', origin: 'flexão' },
  { rating: 'sem contexto', expected: 'out_of_context', origin: 'plano' },
  { rating: 'fora de contexto', expected: 'out_of_context', origin: 'nome do carimbo' },
  { rating: 'distorcido', expected: 'out_of_context', origin: 'plano' },
  { rating: 'exagerado', expected: 'out_of_context', origin: 'plano' },
  { rating: 'impreciso', expected: 'out_of_context', origin: 'plano' },
  { rating: 'verdadeiro', expected: 'true', origin: 'plano' },
  { rating: 'verdadeira', expected: 'true', origin: 'flexão' },
  { rating: 'verdade', expected: 'true', origin: 'plano' },
  { rating: 'correto', expected: 'true', origin: 'plano' },
  { rating: 'subestimado', expected: 'unknown', origin: 'plano: veja a checagem' },
  { rating: 'contraditório', expected: 'unknown', origin: 'plano: veja a checagem' },
  { rating: 'insustentável', expected: 'unknown', origin: 'plano: veja a checagem' },
  { rating: 'ainda é cedo', expected: 'unknown', origin: 'plano: veja a checagem' },
]

const FORMATTING_VARIANTS: readonly RatingCase[] = [
  { rating: 'FALSO', expected: 'false', origin: 'caixa alta' },
  { rating: '  Falso.  ', expected: 'false', origin: 'espaço e pontuação' },
  { rating: 'Fora de Contexto', expected: 'out_of_context', origin: 'caixa mista' },
  { rating: 'fora  de\tcontexto', expected: 'out_of_context', origin: 'espaços repetidos' },
  { rating: 'Distorcido!', expected: 'out_of_context', origin: 'pontuação' },
  { rating: 'VERDADEIRO', expected: 'true', origin: 'caixa alta' },
  { rating: 'Contraditorio', expected: 'unknown', origin: 'sem acento' },
]

// Close to a known label but not equal to one: the stamp would be a guess.
const NEAR_MISSES: readonly RatingCase[] = [
  { rating: '', expected: 'unknown', origin: 'vazio' },
  { rating: '   ', expected: 'unknown', origin: 'só espaço' },
  { rating: 'É falso que', expected: 'unknown', origin: 'frase de título' },
  { rating: 'não é verdade', expected: 'unknown', origin: 'negação' },
  { rating: 'parcialmente falso', expected: 'unknown', origin: 'qualificado' },
  { rating: 'verdadeiro, mas', expected: 'unknown', origin: 'qualificado' },
  { rating: 'falsificado', expected: 'unknown', origin: 'palavra parecida' },
  { rating: 'sátira', expected: 'unknown', origin: 'fora do mapa' },
]

function describeTable(title: string, cases: readonly RatingCase[]): void {
  describe(title, () => {
    it.each(cases)('maps "$rating" to $expected ($origin)', ({ rating, expected }) => {
      expect(normalizeRating(rating)).toBe(expected)
    })
  })
}

describe('normalizeRating', () => {
  describeTable('ratings observed in S2', OBSERVED_RATINGS)
  describeTable('planned vocabulary', PLANNED_RATINGS)
  describeTable('formatting variants', FORMATTING_VARIANTS)
  describeTable('near misses stay unknown', NEAR_MISSES)
})

describe('canonicalizeRating', () => {
  it('drops the explanation after the first colon', () => {
    expect(canonicalizeRating(COMPROVA_RATING_WITH_EXPLANATION)).toBe('falso')
  })

  it('strips accents, case and hashtag marks', () => {
    expect(canonicalizeRating('#NÃOÉBEMASSIM')).toBe('naoebemassim')
  })

  it('collapses punctuation and whitespace to single spaces', () => {
    expect(canonicalizeRating(' Sem   contexto. ')).toBe('sem contexto')
  })
})
