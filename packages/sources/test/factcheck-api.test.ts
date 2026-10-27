import { describe, expect, it } from 'vitest'

import { FACTCHECK_API_ENDPOINT, FactCheckApiClient } from '../src/index.js'

const RESPONSE = {
  claims: [
    {
      text: 'Urna foi fraudada',
      claimant: 'Redes sociais',
      claimDate: '2026-10-20T00:00:00Z',
      claimReview: [
        {
          publisher: { name: 'Aos Fatos', site: 'aosfatos.org' },
          url: 'https://www.aosfatos.org/noticias/urna/',
          title: 'É falso que urna foi fraudada',
          reviewDate: '2026-10-21T12:00:00Z',
          textualRating: 'Falso',
          languageCode: 'pt',
        },
      ],
    },
    { text: 'Sem revisão' },
  ],
  nextPageToken: 'abc',
}

describe('FactCheckApiClient', () => {
  it('searches in Portuguese, sends the key in a header and maps reviews', async () => {
    const seen: { url: string; key: string | null }[] = []
    const fakeFetch: typeof fetch = (input, init) => {
      const url = input instanceof Request ? input.url : input.toString()
      seen.push({ url, key: new Headers(init?.headers).get('x-goog-api-key') })
      return Promise.resolve(new Response(JSON.stringify(RESPONSE)))
    }
    const client = new FactCheckApiClient({
      apiKey: 'chave-de-teste',
      now: () => Date.parse('2026-10-26T00:00:00Z'),
      fetch: fakeFetch,
    })

    const page = await client.search({ reviewPublisherSiteFilter: 'aosfatos.org', pageSize: 50 })

    expect(seen).toHaveLength(1)
    const request = new URL(seen[0]?.url ?? '')
    expect(`${request.origin}${request.pathname}`).toBe(FACTCHECK_API_ENDPOINT)
    expect(request.searchParams.get('languageCode')).toBe('pt')
    expect(request.searchParams.get('key')).toBeNull()
    expect(seen[0]?.key).toBe('chave-de-teste')
    expect(page.nextPageToken).toBe('abc')
    expect(page.fetchedAt).toBe('2026-10-26T00:00:00.000Z')
    expect(page.reviews).toEqual([
      {
        claimText: 'Urna foi fraudada',
        claimant: 'Redes sociais',
        claimDate: '2026-10-20',
        reviewDate: '2026-10-21',
        reviewUrl: 'https://www.aosfatos.org/noticias/urna/',
        headline: 'É falso que urna foi fraudada',
        textualRating: 'Falso',
        ratingValue: null,
        publisherName: 'Aos Fatos',
        publisherSite: 'aosfatos.org',
      },
    ])
  })

  it('fails loudly on an HTTP error', async () => {
    const client = new FactCheckApiClient({
      apiKey: 'x',
      fetch: () => Promise.resolve(new Response('{}', { status: 403 })),
    })
    await expect(client.search({ query: 'urna' })).rejects.toThrow(/HTTP 403/)
  })
})
