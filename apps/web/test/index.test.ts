import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'

import IndexPage from '~/pages/index.vue'

describe('home page', () => {
  it('renders the product name', async () => {
    const page = await mountSuspended(IndexPage)

    expect(page.get('h1').text()).toBe('Carimbo')
  })

  it('always shows each stamp as a word, never only as colour', async () => {
    const page = await mountSuspended(IndexPage)
    const labels = page.findAll('.stamp').map((stamp) => stamp.text())

    expect(labels).toEqual(['Falso', 'Fora de contexto', 'Verdadeiro', 'Veja a checagem'])
  })
})
