import { describe, expect, it } from 'vitest'

import { createSearchIndex, groupReviews, searchClaims } from '../src/index.js'
import { makeReview } from './review-factory.js'

const claims = groupReviews([
  makeReview({
    claimText: 'Urna eletrônica foi hackeada nas eleições de 2022',
    headline: 'É falso que urnas foram invadidas por hackers',
    reviewDate: '2022-10-10',
  }),
  makeReview({
    claimText: 'Eleitor pode perder o voto ao apertar a tecla confirma',
    claimant: 'Boatos nas redes sociais',
    reviewDate: '2024-09-09',
  }),
  makeReview({ claimText: 'Vacina contra covid causa infertilidade', reviewDate: '2021-05-01' }),
  makeReview({
    claimText: 'Governo vai taxar o Pix',
    claimant: 'Deputado Fulano',
    reviewDate: '2025-01-10',
  }),
])

function topClaim(query: string): string | undefined {
  return searchClaims(claims, query)[0]?.claimText
}

describe('searchClaims', () => {
  it('finds a claim without accents', () => {
    expect(topClaim('urna eletronica foi hackeada')).toBe(
      'Urna eletrônica foi hackeada nas eleições de 2022',
    )
  })

  it('tolerates typos', () => {
    expect(topClaim('urna eletronca foi hakeada')).toBe(
      'Urna eletrônica foi hackeada nas eleições de 2022',
    )
    expect(topClaim('vacna covid infertilidade')).toBe('Vacina contra covid causa infertilidade')
  })

  it('matches words by prefix', () => {
    expect(topClaim('taxa pix')).toBe('Governo vai taxar o Pix')
  })

  it('searches headline and claimant too', () => {
    expect(topClaim('invadidas por hackers')).toBe(
      'Urna eletrônica foi hackeada nas eleições de 2022',
    )
    expect(topClaim('deputado fulano')).toBe('Governo vai taxar o Pix')
  })

  it('returns scored results, best first, between 0 and 1', () => {
    const results = searchClaims(claims, 'urna hackeada', { minScore: 0 })
    const scores = results.map((result) => result.score)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
    for (const score of scores) {
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(1)
    }
  })

  it('returns nothing for unrelated text or only punctuation', () => {
    expect(searchClaims(claims, 'receita de bolo de cenoura')).toEqual([])
    expect(searchClaims(claims, '?!')).toEqual([])
  })

  it('respects the limit', () => {
    expect(createSearchIndex(claims).search('o', { minScore: 0, limit: 2 })).toHaveLength(2)
  })
})
