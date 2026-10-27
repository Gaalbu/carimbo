import { describe, expect, it } from 'vitest'

import {
  compareNewestFirst,
  findRelated,
  groupReviews,
  isSameClaim,
  trigramSimilarity,
} from '../src/index.js'
import { makeReview } from './review-factory.js'

const DEBATE = 'Lula passou mal e não irá ao debate da Globo no dia 23 de outubro de 2026'

describe('isSameClaim', () => {
  it.each([
    [DEBATE, 'Lula passou mal e não vai ao debate da Globo no dia 23 de outubro de 2026'],
    [
      'Eleitor pode perder o voto ao apertar a tecla confirma',
      'Eleitor pode perder o voto se apertar a tecla confirma',
    ],
    ['Urna eletrônica foi hackeada', 'URNA ELETRONICA FOI HACKEADA!'],
    ['Urnas fraudadas em São Paulo, diz vídeo', 'Urnas fraudada em Sao Paulo diz video'],
  ])('merges rewordings: "%s" ~ "%s"', (a, b) => {
    expect(isSameClaim(a, b)).toBe(true)
  })

  // Near misses: high trigram similarity, different claims. None may merge.
  it.each([
    [DEBATE, 'Bolsonaro passou mal e não irá ao debate da Globo no dia 23 de outubro de 2026'],
    [DEBATE, 'Lula passou mal e não irá ao debate da Record no dia 23 de outubro de 2026'],
    [DEBATE, 'Lula passou mal e não irá ao debate da Globo no dia 25 de outubro de 2026'],
    [DEBATE, 'Lula passou mal e irá ao debate da Globo no dia 23 de outubro de 2026'],
    [
      'Eleitor pode perder o voto ao apertar a tecla confirma',
      'Eleitor pode perder o voto ao apertar a tecla corrige',
    ],
    [
      'Vacina contra covid causa infertilidade em mulheres',
      'Vacina contra gripe causa infertilidade em mulheres',
    ],
    ['Vacina com efeito colateral grave', 'Vacina sem efeito colateral grave'],
    ['Governo vai cortar 3 mil vagas', 'Governo vai cortar 30 mil vagas'],
  ])('keeps apart "%s" / "%s"', (a, b) => {
    expect(isSameClaim(a, b)).toBe(false)
  })

  it('documents that the word gate, not the trigram threshold, separates swapped names', () => {
    const swapped = 'Bolsonaro passou mal e não irá ao debate da Globo no dia 23 de outubro de 2026'
    expect(trigramSimilarity(DEBATE, swapped)).toBeGreaterThan(0.8)
  })
})

describe('groupReviews', () => {
  it('never duplicates a review id, keeping the latest fetch', () => {
    const first = makeReview({ claimText: DEBATE, reviewUrl: 'https://exemplo.invalid/a' })
    const refetched = makeReview({
      id: first.id,
      claimText: DEBATE,
      reviewUrl: 'https://exemplo.invalid/a',
      textualRating: 'Enganoso',
      provenance: { ...first.provenance, fetchedAt: '2026-10-27T00:00:00.000Z' },
    })
    const groups = groupReviews([first, refetched])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.reviews).toEqual([refetched])
  })

  it('keeps distinct claims checked on the same page', () => {
    const page = 'https://exemplo.invalid/varias'
    const groups = groupReviews([
      makeReview({ claimText: DEBATE, reviewUrl: page }),
      makeReview({ claimText: 'Vacina altera o DNA de quem toma', reviewUrl: page }),
    ])
    expect(groups).toHaveLength(2)
  })

  it('keeps every verdict side by side in one group', () => {
    const falso = makeReview({
      claimText: DEBATE,
      checkerId: 'aos-fatos',
      reviewDate: '2026-10-23',
    })
    const contexto = makeReview({
      claimText: 'Lula passou mal e não vai ao debate da Globo no dia 23 de outubro de 2026',
      checkerId: 'lupa',
      textualRating: 'Sem contexto',
      reviewDate: '2026-10-24',
      claimant: 'Post no X',
    })
    const [group, ...rest] = groupReviews([contexto, falso])
    expect(rest).toEqual([])
    expect(group?.reviews.map((review) => review.verdict)).toEqual(['false', 'out_of_context'])
    expect(group?.claimText).toBe(DEBATE)
    expect(group?.claimant).toBe('Post no X')
    expect(group?.latestReviewDate).toBe('2026-10-24')
    expect(group?.themes).toEqual(['urna-e-eleicao', 'politica'])
  })

  it('does not chain different claims into one group', () => {
    const reviews = [
      makeReview({ claimText: DEBATE }),
      makeReview({ claimText: DEBATE.replace('Lula', 'Bolsonaro') }),
      makeReview({ claimText: DEBATE.replace('Globo', 'Record') }),
    ]
    expect(groupReviews(reviews)).toHaveLength(3)
  })

  it('gives each group a stable, readable slug', () => {
    const review = makeReview({ claimText: 'Urna eletrônica foi hackeada', id: 'abcdef0123456789' })
    const later = makeReview({
      claimText: 'Urna eletronica foi hackeada',
      reviewDate: '2026-10-25',
    })
    const [group] = groupReviews([later, review])
    expect(group?.slug).toBe('urna-eletronica-foi-hackeada-abcdef01')
    const [again] = groupReviews([review, later])
    expect(again?.slug).toBe(group?.slug)
  })

  it('puts undated reviews last and reports no date when none is known', () => {
    const undated = makeReview({ claimText: 'Pix será taxado', reviewDate: null })
    const [group] = groupReviews([undated])
    expect(group?.latestReviewDate).toBeNull()
  })
})

describe('feed helpers', () => {
  it('orders newest first, undated last', () => {
    const groups = groupReviews([
      makeReview({ claimText: 'Pix será taxado', reviewDate: null }),
      makeReview({ claimText: 'Urna foi hackeada', reviewDate: '2022-10-10' }),
      makeReview({ claimText: 'Vacina causa autismo', reviewDate: '2026-10-01' }),
    ]).sort(compareNewestFirst)
    expect(groups.map((group) => group.latestReviewDate)).toEqual([
      '2026-10-01',
      '2022-10-10',
      null,
    ])
  })

  it('lists similar groups that were not merged as related', () => {
    const groups = groupReviews([
      makeReview({ claimText: DEBATE }),
      makeReview({ claimText: DEBATE.replace('Lula', 'Bolsonaro') }),
      makeReview({ claimText: 'Vacina causa autismo' }),
    ])
    const [lula] = groups
    if (lula === undefined) throw new Error('missing group')
    expect(findRelated(lula, groups).map((group) => group.claimText)).toEqual([
      DEBATE.replace('Lula', 'Bolsonaro'),
    ])
  })
})
