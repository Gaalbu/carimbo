import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ClaimPage from '~/pages/c/[slug].vue'
import BuscarPage from '~/pages/buscar.vue'
import CoberturaPage from '~/pages/cobertura.vue'

import { checkers, claim, claimDetail, coverage } from './fixtures'

beforeEach(() => {
  clearNuxtData()
  registerEndpoint('/v1/checkers', () => checkers)
})

describe('claim page', () => {
  it('shows one big stamp per checker, side by side, never merged', async () => {
    registerEndpoint(`/v1/claims/${claim.slug}`, () => claimDetail)
    const page = await mountSuspended(ClaimPage, { route: `/c/${claim.slug}` })
    const stamps = page.findAll('.verdict .stamp')

    expect(stamps.map((stamp) => stamp.attributes('aria-label'))).toEqual([
      'Falso, segundo Aos Fatos, 24/10/2026',
      'Fora de contexto, segundo Lupa, data não informada',
    ])
    expect(page.findAll('a').some((a) => a.text().startsWith('Ler a checagem completa'))).toBe(true)
  })

  it('shares to WhatsApp with the stamp, the claim and the page link', async () => {
    registerEndpoint(`/v1/claims/${claim.slug}`, () => claimDetail)
    const page = await mountSuspended(ClaimPage, { route: `/c/${claim.slug}` })
    const share = page.findAll('a').find((a) => a.text() === 'Mandar no WhatsApp')
    const href = share?.attributes('href') ?? ''

    expect(href.startsWith('https://wa.me/?text=')).toBe(true)
    const text = decodeURIComponent(href.slice('https://wa.me/?text='.length))
    expect(text).toContain('FALSO / FORA DE CONTEXTO: "Urna eletrônica foi hackeada na seção 123"')
    expect(text).toContain(`https://carimbo.test/c/${claim.slug}`)
  })

  it('titles a single-verdict claim "FALSO: <claim>"', async () => {
    const single = { ...claimDetail, reviews: claim.reviews.slice(0, 1) }
    registerEndpoint(`/v1/claims/${claim.slug}`, () => single)
    await mountSuspended(ClaimPage, { route: `/c/${claim.slug}` })

    await vi.waitFor(() =>
      expect(document.title).toBe('FALSO: Urna eletrônica foi hackeada na seção 123'),
    )
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      'FALSO: Urna eletrônica foi hackeada na seção 123',
    )
  })
})

describe('search page', () => {
  it('lists similar checks', async () => {
    registerEndpoint('/v1/search', () => ({ query: 'urna', items: [{ ...claim, score: 0.8 }] }))
    const page = await mountSuspended(BuscarPage, { route: '/buscar?q=urna' })

    expect(page.findAll('[data-feed-item]')).toHaveLength(1)
    expect(page.text()).toContain('1 checagem parecida')
  })

  it('sends people to the checkers when nothing was checked yet', async () => {
    registerEndpoint('/v1/search', () => ({ query: 'boato novo', items: [] }))
    const page = await mountSuspended(BuscarPage, { route: '/buscar?q=boato%20novo' })

    expect(page.text()).toContain('Ainda não checado. Envie para um checador')
    const submit = page.findAll('.submit a').map((a) => a.attributes('href'))
    // Only checkers with an official channel are listed.
    expect(submit).toEqual(['https://www.aosfatos.org/fatima'])
  })
})

describe('coverage page', () => {
  it('renders gaps as "sem cobertura"', async () => {
    registerEndpoint('/v1/coverage', () => coverage)
    const page = await mountSuspended(CoberturaPage, { route: '/cobertura' })

    expect(page.text()).toContain('sem cobertura')
    expect(page.text()).toContain('120')
  })
})
