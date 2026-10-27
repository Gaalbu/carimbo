import { describe, expect, it } from 'vitest'

import {
  CHECKER_IDS,
  ELECTIONS,
  electionForDate,
  FACT_CHECKERS,
  findChecker,
  findElection,
  findTheme,
  isInCampaign,
  tagThemes,
  THEMES,
} from '../src/index.js'

describe('FACT_CHECKERS', () => {
  it('covers exactly the seven agencies of the plan', () => {
    expect(CHECKER_IDS).toEqual([
      'lupa',
      'aos-fatos',
      'estadao-verifica',
      'uol-confere',
      'afp-checamos',
      'comprova',
      'g1-fato-ou-fake',
    ])
  })

  it('uses https URLs only', () => {
    for (const checker of FACT_CHECKERS) {
      expect(checker.homepage).toMatch(/^https:\/\//)
      if (checker.submitUrl !== null) expect(checker.submitUrl).toMatch(/^https:\/\//)
    }
  })

  it('finds a checker by id', () => {
    expect(findChecker('comprova')?.name).toBe('Projeto Comprova')
    expect(findChecker('inexistente')).toBeUndefined()
  })
})

describe('ELECTIONS', () => {
  it('lists every election from 2014 to 2026 with a valid period', () => {
    expect(ELECTIONS.map((election) => election.year)).toEqual([
      2014, 2016, 2018, 2020, 2022, 2024, 2026,
    ])
    for (const election of ELECTIONS) {
      expect(election.campaignStart < election.campaignEnd).toBe(true)
      expect(election.rounds.at(-1)).toBe(election.campaignEnd)
      expect(election.campaignStart.startsWith(String(election.year))).toBe(true)
    }
  })

  it('reflects the 2020 postponement (EC 107/2020)', () => {
    expect(findElection(2020)).toMatchObject({
      campaignStart: '2020-09-27',
      campaignEnd: '2020-11-29',
    })
  })

  it('includes both ends of the campaign', () => {
    const election2022 = findElection(2022)
    if (election2022 === undefined) throw new Error('2022 missing')
    expect(isInCampaign('2022-08-16', election2022)).toBe(true)
    expect(isInCampaign('2022-10-30T23:00:00Z', election2022)).toBe(true)
    expect(isInCampaign('2022-08-15', election2022)).toBe(false)
    expect(isInCampaign('2022-10-31', election2022)).toBe(false)
    expect(isInCampaign(null, election2022)).toBe(false)
  })

  it('finds the election of a date, if any', () => {
    expect(electionForDate('2024-09-09')?.year).toBe(2024)
    expect(electionForDate('2023-05-01')).toBeUndefined()
  })
})

describe('tagThemes', () => {
  it('matches without accents and by prefix', () => {
    expect(tagThemes('Urna eletrônica foi hackeada')).toEqual(['urna-e-eleicao'])
    expect(tagThemes('VACINAÇÃO contra a covid causa infertilidade')).toEqual(['saude'])
  })

  it('tags several themes and reads every text given', () => {
    expect(tagThemes('Lula vai taxar o Pix', null, 'diz post')).toEqual(['economia', 'politica'])
  })

  it('matches whole words, not fragments', () => {
    // "tre" must not match "entre", "pt" must not match "apto".
    expect(tagThemes('Entre os aptos')).toEqual([])
  })

  it('matches multi-word keywords in sequence only', () => {
    expect(tagThemes('Aquecimento global é farsa')).toEqual(['clima-e-ambiente'])
    expect(tagThemes('Aquecimento do mercado global')).toEqual([])
  })

  it('has unique slugs and folded keywords', () => {
    expect(new Set(THEMES.map((theme) => theme.slug)).size).toBe(THEMES.length)
    for (const theme of THEMES) {
      for (const keyword of theme.keywords) expect(keyword).toMatch(/^[a-z0-9 ]+\*?$/)
    }
    expect(findTheme('saude')?.name).toBe('Saúde')
  })
})
