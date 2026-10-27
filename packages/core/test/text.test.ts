import { describe, expect, it } from 'vitest'

import { claimSlug, foldText, slugify, tokenize, trigramSimilarity } from '../src/index.js'
import { editDistance, isNearWord } from '../src/text.js'

describe('foldText', () => {
  it('removes accents, case and punctuation', () => {
    expect(foldText('  Eleições: É FALSO que a urna   foi hackeada!  ')).toBe(
      'eleicoes e falso que a urna foi hackeada',
    )
  })

  it('tokenizes empty text to no words', () => {
    expect(tokenize(' ... ')).toEqual([])
  })
})

describe('trigramSimilarity', () => {
  it('is 1 for texts that differ only in accents and case', () => {
    expect(trigramSimilarity('Eleição', 'eleicao')).toBe(1)
  })

  it('is 0 for texts with nothing in common, and for empty texts', () => {
    expect(trigramSimilarity('pix', 'urna')).toBe(0)
    expect(trigramSimilarity('', '')).toBe(0)
  })
})

describe('editDistance', () => {
  it('counts insertions, deletions and substitutions', () => {
    expect(editDistance('hakeada', 'hackeada', 2)).toBe(1)
    expect(editDistance('eletronica', 'eletrnoica', 2)).toBe(2)
  })

  it('stops early beyond the maximum', () => {
    expect(editDistance('urna', 'vacina', 1)).toBe(2)
  })

  it('tolerates typos only on longer words', () => {
    expect(isNearWord('fraudada', 'fraudadas')).toBe(true)
    expect(isNearWord('3', '30')).toBe(false)
    expect(isNearWord('lula', 'luta')).toBe(true)
    expect(isNearWord('pt', 'pl')).toBe(false)
  })
})

describe('slugs', () => {
  it('builds a readable ASCII slug from the first words', () => {
    expect(slugify('Lula passou mal e não irá ao debate da Globo no dia 23')).toBe(
      'lula-passou-mal-e-nao-ira-ao-debate',
    )
  })

  it('keeps slugs short and falls back when there is no text', () => {
    expect(slugify('Inconstitucionalíssimo '.repeat(10)).length).toBeLessThanOrEqual(60)
    expect(slugify('!!!')).toBe('alegacao')
  })

  it('appends a short hash taken from the review id', () => {
    expect(claimSlug('Urna foi hackeada', '7f3a9c0d12e4b5a6')).toBe('urna-foi-hackeada-7f3a9c0d')
  })
})
