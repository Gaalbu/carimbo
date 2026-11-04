import { describe, expect, it } from 'vitest'
import { CHECKER_SOURCES } from '../src/checkers.js'

describe('Comprova historical sitemap discovery', () => {
  const backfill = CHECKER_SOURCES.find((source) => source.checkerId === 'comprova')?.backfill
  it('discovers the annual 2018 archive only when it overlaps the requested period', () => {
    expect(
      backfill?.includeChild(
        'https://projetocomprova.com.br/sitemap-posttype-archived-answer.2018.xml',
        '2014-01-01',
      ),
    ).toBe(true)
    expect(
      backfill?.includeChild(
        'https://projetocomprova.com.br/sitemap-posttype-archived-answer.2018.xml',
        '2019-01-01',
      ),
    ).toBe(false)
  })
  it('includes historical post routes while rejecting unrelated paths', () => {
    expect(backfill?.includePage('https://projetocomprova.com.br/post/re_2b5w8xz5jmvb/')).toBe(true)
    expect(backfill?.includePage('https://projetocomprova.com.br/about/metodologia/')).toBe(false)
  })
})
