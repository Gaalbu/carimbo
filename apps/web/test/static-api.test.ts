import { buildSnapshot, type ClaimDetail, type ClaimSummary, type Page } from '@carimbo/core'
import { describe, expect, it } from 'vitest'

import { withAppBase } from '~/utils/base-url'
import { decodeCursor, encodeCursor, resolveStaticApi, StaticApiError } from '~/utils/static-api'

import { review } from './fixtures'

const snapshot = buildSnapshot({
  schemaVersion: 1,
  generatedAt: '2026-10-26T12:00:00.000Z',
  reviews: [
    review({ id: 'a', claimText: 'Urna eletrônica foi hackeada na seção 123' }),
    review({ id: 'b', claimText: 'Vacina da gripe causa infertilidade', reviewDate: '2026-10-20' }),
    review({ id: 'c', claimText: 'Ministro anunciou fim do décimo terceiro', reviewDate: null }),
  ],
})
const NOW = new Date('2026-10-26T15:00:00Z')

function get<T>(path: string, query: Record<string, unknown> = {}): T {
  return resolveStaticApi(snapshot, path, query, NOW) as T
}

function statusOf(run: () => unknown): number | undefined {
  try {
    run()
  } catch (error) {
    if (error instanceof StaticApiError) return error.statusCode
  }
  return undefined
}

describe('static API', () => {
  it('uses the same cursor format as the API', () => {
    // Buffer.from('o:20').toString('base64url') in apps/api.
    expect(encodeCursor(20)).toBe('bzoyMA')
    expect(decodeCursor('bzoyMA')).toBe(20)
    expect(decodeCursor('nao-e-cursor')).toBeNull()
  })

  it('pages the feed and follows the cursor', () => {
    const first = get<Page<ClaimSummary>>('/v1/claims', { limit: 2, verdict: undefined })
    expect(first.total).toBe(3)
    expect(first.items).toHaveLength(2)
    const rest = get<Page<ClaimSummary>>('/v1/claims', { limit: 2, cursor: first.nextCursor })
    expect(rest.items).toHaveLength(1)
    expect(rest.nextCursor).toBeNull()
  })

  it('answers claim detail, search, stats and catalogs', () => {
    const slug = snapshot.claims[0]?.slug ?? ''
    expect(get<ClaimDetail>(`/v1/claims/${slug}`).slug).toBe(slug)
    expect(get<{ items: unknown[] }>('/v1/search', { q: 'urna hackeada' }).items).not.toHaveLength(
      0,
    )
    expect(get<{ total: number }>('/v1/stats/today', { days: 7 }).total).toBe(2)
    expect(get<unknown[]>('/v1/checkers').length).toBeGreaterThan(0)
    expect(get<unknown[]>('/v1/themes').length).toBeGreaterThan(0)
    expect(get<unknown[]>('/v1/elections').length).toBeGreaterThan(0)
    expect(get<{ years: number[] }>('/v1/coverage').years.at(-1)).toBe(2026)
  })

  it('fails like the API', () => {
    expect(statusOf(() => get('/v1/claims/nao-existe'))).toBe(404)
    expect(statusOf(() => get('/v1/nada'))).toBe(404)
    expect(statusOf(() => get('/v1/search', { q: 'ab' }))).toBe(400)
    expect(statusOf(() => get('/v1/claims', { verdict: 'talvez' }))).toBe(400)
    expect(statusOf(() => get('/v1/claims', { cursor: 'xyz' }))).toBe(400)
    expect(statusOf(() => get('/v1/claims', { election: 1999 }))).toBe(400)
  })

  it('joins public paths with the app base', () => {
    expect(withAppBase('/', 'dados/reviews.json')).toBe('/dados/reviews.json')
    expect(withAppBase('/carimbo/', '/og.png')).toBe('/carimbo/og.png')
    expect(withAppBase('/carimbo', 'og.png')).toBe('/carimbo/og.png')
  })
})
