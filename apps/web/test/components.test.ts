import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'

import ClaimCard from '~/components/ClaimCard.vue'
import CoverageTable from '~/components/CoverageTable.vue'
import Scoreboard from '~/components/Scoreboard.vue'
import Stamp from '~/components/Stamp.vue'

import { checkers, claim, coverage, review } from './fixtures'

const names = { 'aos-fatos': 'Aos Fatos', lupa: 'Lupa' }

describe('<Stamp>', () => {
  it.each([
    ['false', 'Falso'],
    ['out_of_context', 'Fora de contexto'],
    ['true', 'Verdadeiro'],
    ['unknown', 'Veja a checagem'],
  ] as const)('always prints the word for %s', async (verdict, word) => {
    const stamp = await mountSuspended(Stamp, { props: { verdict } })

    expect(stamp.text()).toBe(word)
    expect(stamp.attributes('role')).toBe('img')
  })

  it('describes checker and date in the accessible label', async () => {
    const stamp = await mountSuspended(Stamp, {
      props: { verdict: 'false', checker: 'Aos Fatos', date: '2026-10-24' },
    })

    expect(stamp.attributes('aria-label')).toBe('Falso, segundo Aos Fatos, 24/10/2026')
  })

  it('announces a missing date as missing', async () => {
    const stamp = await mountSuspended(Stamp, {
      props: { verdict: 'true', checker: 'Lupa', date: null },
    })

    expect(stamp.attributes('aria-label')).toBe('Verdadeiro, segundo Lupa, data não informada')
  })
})

describe('<ClaimCard>', () => {
  it('shows each checker with its original rating, side by side', async () => {
    const card = await mountSuspended(ClaimCard, { props: { claim, checkerNames: names } })

    expect(card.findAll('.stamp')).toHaveLength(2)
    expect(card.text()).toContain('Aos Fatos: falso')
    expect(card.text()).toContain('Lupa: Enganoso')
    expect(card.get('a.card__link').attributes('href')).toBe('/c/urna-hackeada-secao-123')
  })

  it('says "data não informada" instead of inventing a date', async () => {
    const card = await mountSuspended(ClaimCard, { props: { claim, checkerNames: names } })
    const [first, second] = card.findAll('.card__review')

    expect(first?.text()).toContain('24/10/2026')
    expect(second?.text()).toContain('data não informada')
  })

  it('flags archived sources with the snapshot date', async () => {
    const archived = {
      ...claim,
      reviews: [
        review({ archivedUrl: 'https://web.archive.org/web/20181005123456/https://example.org/x' }),
      ],
    }
    const card = await mountSuspended(ClaimCard, { props: { claim: archived } })

    expect(card.text()).toContain('fonte arquivada em 05/10/2018')
  })

  it('falls back to the checker id when the name is unknown', async () => {
    const card = await mountSuspended(ClaimCard, { props: { claim } })

    expect(card.text()).toContain('aos-fatos: falso')
  })
})

describe('<CoverageTable>', () => {
  it('shows "sem cobertura" for missing pairs, never zero', async () => {
    const table = await mountSuspended(CoverageTable, { props: { coverage } })
    const cells = table.findAll('tbody td').map((cell) => cell.text())

    // Rows: Aos Fatos, Lupa; columns: 2022, 2018.
    expect(cells[0]).toContain('120')
    expect(cells[0]).toContain('16/08/2022 a 30/10/2022')
    expect(cells.slice(1)).toEqual(['sem cobertura', 'sem cobertura', 'sem cobertura'])
    expect(cells.some((cell) => cell === '0')).toBe(false)
    expect(table.findAll('tbody th').map((th) => th.text())).toEqual(checkers.map((c) => c.name))
  })

  it('can be restricted to one year', async () => {
    const table = await mountSuspended(CoverageTable, { props: { coverage, years: [2018] } })

    expect(table.findAll('thead th').map((th) => th.text())).toEqual(['Checador', '2018'])
  })
})

describe('<Scoreboard>', () => {
  it('turns the counts into a headline sentence', async () => {
    const board = await mountSuspended(Scoreboard, {
      props: {
        lead: 'Hoje',
        counts: { false: 14, out_of_context: 5, true: 1, unknown: 0 },
        total: 20,
      },
    })

    expect(board.get('h2').text()).toBe('Hoje: 14 falsos, 5 fora de contexto e 1 verdadeiro')
    expect(board.text()).toContain('20 checagens indexadas pelo Carimbo')
  })
})
