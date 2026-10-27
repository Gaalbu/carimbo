import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it } from 'vitest'

import IndexPage from '~/pages/index.vue'

import { checkers, claimsPage, emptyPage, stats } from './fixtures'

function failing() {
  throw new Error('API down')
}

function queryOf(event: { path: string }): URLSearchParams {
  return new URL(event.path, 'http://test').searchParams
}

function registerHappyApi(day = stats(), week = stats()) {
  registerEndpoint('/v1/stats/today', (event) => (queryOf(event).get('days') === '7' ? week : day))
  registerEndpoint('/v1/claims', () => claimsPage)
  registerEndpoint('/v1/checkers', () => checkers)
  registerEndpoint('/v1/themes', () => [
    { slug: 'urna-e-eleicao', name: 'Urna e eleição', count: 3 },
  ])
}

describe('home page', () => {
  beforeEach(() => {
    clearNuxtData()
  })

  it('shows the scoreboard of the day as a sentence', async () => {
    registerHappyApi()
    const page = await mountSuspended(IndexPage, { route: '/' })

    expect(page.get('.score__headline').text()).toBe(
      'Hoje: 14 falsos, 5 fora de contexto e 2 verdadeiros',
    )
    expect(page.text()).toContain('checagens indexadas pelo Carimbo')
  })

  it('renders the feed with each checker by name', async () => {
    registerHappyApi()
    const page = await mountSuspended(IndexPage, { route: '/' })

    expect(page.findAll('[data-feed-item]')).toHaveLength(1)
    expect(page.text()).toContain('Aos Fatos: falso')
    expect(page.text()).toContain('Lupa: Enganoso')
  })

  it('falls back to the last 7 days when today is empty, and says so', async () => {
    registerHappyApi(
      stats({ counts: { false: 0, out_of_context: 0, true: 0, unknown: 0 }, total: 0 }),
      stats({ counts: { false: 3, out_of_context: 0, true: 0, unknown: 1 }, total: 4 }),
    )
    const page = await mountSuspended(IndexPage, { route: '/' })

    expect(page.get('.score__headline').text()).toBe(
      'Últimos 7 dias: 3 falsos e 1 com outra avaliação',
    )
    expect(page.text()).toContain('por isso o placar mostra os últimos 7 dias')
  })

  it('says nothing is indexed yet instead of showing placeholders', async () => {
    registerHappyApi(
      stats({
        counts: { false: 0, out_of_context: 0, true: 0, unknown: 0 },
        total: 0,
        indexed: 0,
        updatedAt: null,
      }),
    )
    registerEndpoint('/v1/claims', () => emptyPage)
    const page = await mountSuspended(IndexPage, { route: '/' })

    expect(page.text()).toContain('Ainda não há checagens indexadas')
    expect(page.find('[data-feed-item]').exists()).toBe(false)
  })

  it('shows an error state when the API is down', async () => {
    registerEndpoint('/v1/stats/today', failing)
    registerEndpoint('/v1/claims', failing)
    registerEndpoint('/v1/checkers', failing)
    registerEndpoint('/v1/themes', failing)
    const page = await mountSuspended(IndexPage, { route: '/' })

    expect(page.text()).toContain('a API do Carimbo não respondeu')
    expect(page.text()).toContain('Não foi possível carregar as checagens agora.')
    expect(page.find('[data-feed-item]').exists()).toBe(false)
  })

  it('always shows the stamp filters as words', async () => {
    registerHappyApi()
    const page = await mountSuspended(IndexPage, { route: '/' })
    const labels = page.findAll('.chip').map((chip) => chip.text())

    expect(labels).toEqual(['Todos', 'Falso', 'Fora de contexto', 'Verdadeiro', 'Veja a checagem'])
  })
})
