import { copyFile, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type {
  CheckerWithCount,
  ClaimDetail,
  ClaimSummary,
  CoverageResponse,
  Election,
  Page,
  ReviewStore,
  SearchResult,
  StatsResponse,
  ThemeWithCount,
} from '@carimbo/core'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildApp } from '../src/app.js'
import { escapeCsv } from '../src/routes/export.js'

// 3 reviews mapped from packages/sources/test/fixtures plus synthetic ones (exemplo.invalid).
const FIXTURE = fileURLToPath(new URL('fixtures/reviews.json', import.meta.url))
// 12:00 in Brasília on the day after the 2026 runoff.
const NOW = new Date('2026-10-26T15:00:00Z')

const LULA_DEBATE_SLUG = 'lula-passou-mal-e-nao-ira-ao-debate'

let app: FastifyInstance

beforeAll(() => {
  app = buildApp({ dataFile: FIXTURE, now: () => NOW })
})

afterAll(async () => {
  await app.close()
})

interface JsonResponse<T> {
  readonly status: number
  readonly body: T
  readonly headers: Record<string, unknown>
}

async function get<T = unknown>(url: string): Promise<JsonResponse<T>> {
  const response = await app.inject({ method: 'GET', url })
  return { status: response.statusCode, body: response.json<T>(), headers: response.headers }
}

function slugs(page: Page<ClaimSummary>): string[] {
  return page.items.map((item) => item.slug.replace(/-[0-9a-f]{8}$/, ''))
}

describe('GET /v1/claims', () => {
  it('lists claim groups newest first, undated last', async () => {
    const { status, body, headers } = await get<Page<ClaimSummary>>('/v1/claims')
    expect(status).toBe(200)
    expect(headers['cache-control']).toBe('public, max-age=60, stale-while-revalidate=300')
    expect(body.total).toBe(9)
    expect(body.nextCursor).toBeNull()
    expect(body.items.map((item) => item.latestReviewDate)).toEqual([
      '2026-10-26',
      '2026-10-25',
      '2026-10-25',
      '2026-10-24',
      '2026-10-24',
      '2024-09-09',
      '2022-10-10',
      '2018-09-20',
      null,
    ])
  })

  it('paginates with an opaque cursor', async () => {
    const first = await get<Page<ClaimSummary>>('/v1/claims?limit=4')
    expect(first.body.items).toHaveLength(4)
    expect(first.body.total).toBe(9)
    const cursor = first.body.nextCursor
    expect(cursor).not.toBeNull()
    const second = await get<Page<ClaimSummary>>(`/v1/claims?limit=4&cursor=${cursor ?? ''}`)
    const third = await get<Page<ClaimSummary>>(
      `/v1/claims?limit=4&cursor=${second.body.nextCursor ?? ''}`,
    )
    expect(third.body.items).toHaveLength(1)
    expect(third.body.nextCursor).toBeNull()
    const all = [...slugs(first.body), ...slugs(second.body), ...slugs(third.body)]
    expect(new Set(all).size).toBe(9)
  })

  it.each([
    ['verdict=true', ['imposto-sobre-o-pix-comeca-a-valer-em']],
    ['verdict=unknown', ['governo-vai-taxar-o-pix-a-partir-de']],
    ['checker=lupa', ['imposto-sobre-o-pix-comeca-a-valer-em', LULA_DEBATE_SLUG]],
    ['theme=saude', ['vacina-contra-a-gripe-causa-paralisia-diz-post']],
    ['election=2022', ['urna-eletronica-foi-hackeada-nas-eleicoes-de-2022']],
    ['election=2018', ['urna-completa-o-voto-sozinha-com-o-numero']],
    ['election=2024', ['eleitor-pode-perder-o-voto-ao-apertar-a']],
    ['election=2014', []],
    [
      'checker=comprova&verdict=false&theme=urna-e-eleicao',
      ['eleitor-pode-perder-o-voto-ao-apertar-a'],
    ],
  ])('filters by %s', async (query, expected) => {
    const { status, body } = await get<Page<ClaimSummary>>(`/v1/claims?${query}`)
    expect(status).toBe(200)
    expect(slugs(body)).toEqual(expected)
    expect(body.total).toBe(expected.length)
  })

  it('keeps the whole group when one review matches a filter', async () => {
    const { body } = await get<Page<ClaimSummary>>('/v1/claims?verdict=out_of_context&checker=lupa')
    expect(body.items[0]?.reviews.map((review) => review.checkerId)).toEqual(['aos-fatos', 'lupa'])
  })

  it.each([
    'verdict=mentira',
    'checker=inexistente',
    'theme=futebol',
    'election=2015',
    'election=abc',
    'limit=0',
    'limit=101',
    'cursor=xyz',
  ])('rejects %s with a JSON 400', async (query) => {
    const { status, body, headers } = await get<{ statusCode: number; message: string }>(
      `/v1/claims?${query}`,
    )
    expect(status).toBe(400)
    expect(body.statusCode).toBe(400)
    expect(body.message).not.toBe('')
    expect(headers['cache-control']).toBe('no-store')
  })
})

describe('GET /v1/claims/:slug', () => {
  it('shows every verdict side by side, and similar claims as related', async () => {
    const page = await get<Page<ClaimSummary>>('/v1/claims?checker=aos-fatos')
    const slug = page.body.items[0]?.slug ?? ''
    expect(slug.startsWith(LULA_DEBATE_SLUG)).toBe(true)

    const { status, body } = await get<ClaimDetail>(`/v1/claims/${slug}`)
    expect(status).toBe(200)
    expect(body.reviews.map((review) => [review.checkerId, review.verdict])).toEqual([
      ['aos-fatos', 'false'],
      ['lupa', 'out_of_context'],
    ])
    expect(body.claimText).toBe(
      'Lula passou mal e não irá ao debate da Globo no dia 23 de outubro de 2026',
    )
    // The real Aos Fatos record was also stored as an older synthetic copy: it appears once.
    expect(body.reviews.filter((review) => review.checkerId === 'aos-fatos')).toHaveLength(1)
    expect(body.reviews[0]?.provenance.parserVersion).toBe('claimreview@1')
    expect(body.related.map((claim) => claim.claimText)).toEqual([
      'Bolsonaro passou mal e não irá ao debate da Globo no dia 23 de outubro de 2026',
    ])
  })

  it('answers a JSON 404 for an unknown slug', async () => {
    const { status, body } = await get<{ message: string }>('/v1/claims/nao-existe-00000000')
    expect(status).toBe(404)
    expect(body.message).toBe('Alegação não encontrada')
  })
})

describe('GET /v1/search', () => {
  it('finds claims without accents and with typos', async () => {
    const { status, body } = await get<SearchResult>(
      `/v1/search?q=${encodeURIComponent('urna eletronca foi hakeada')}`,
    )
    expect(status).toBe(200)
    expect(body.query).toBe('urna eletronca foi hakeada')
    expect(body.items[0]?.claimText).toBe('Urna eletrônica foi hackeada nas eleições de 2022')
    expect(body.items[0]?.score).toBeGreaterThan(0.5)
  })

  it('ranks the same claim above a near miss', async () => {
    const { body } = await get<SearchResult>(`/v1/search?q=${encodeURIComponent('lula pasou mal')}`)
    expect(body.items[0]?.claimText).toMatch(/^Lula passou mal/)
    expect(body.items[0]?.reviews).toHaveLength(2)
  })

  it('returns an empty list when nothing matches', async () => {
    const { status, body } = await get<SearchResult>('/v1/search?q=receita%20de%20bolo')
    expect(status).toBe(200)
    expect(body.items).toEqual([])
  })

  it.each(['/v1/search', '/v1/search?q=ab', '/v1/search?q=%20%20ab%20'])(
    'rejects %s with 400',
    async (url) => {
      const { status, body } = await get<{ message: string }>(url)
      expect(status).toBe(400)
      expect(body.message).toMatch(/q/)
    },
  )
})

describe('GET /v1/stats/today', () => {
  it('counts today in Brasília by default', async () => {
    const { body } = await get<StatsResponse>('/v1/stats/today')
    expect(body).toEqual({
      from: '2026-10-26',
      to: '2026-10-26',
      counts: { false: 0, out_of_context: 0, true: 0, unknown: 1 },
      total: 1,
      indexed: 10,
      updatedAt: '2026-10-26T12:00:00.000Z',
    })
  })

  it('counts a window of several days', async () => {
    const { body } = await get<StatsResponse>('/v1/stats/today?days=7')
    expect(body.from).toBe('2026-10-20')
    expect(body.counts).toEqual({ false: 2, out_of_context: 2, true: 1, unknown: 1 })
    expect(body.total).toBe(6)
  })

  it('uses the Brasília date, not UTC, late at night', async () => {
    const lateApp = buildApp({ dataFile: FIXTURE, now: () => new Date('2026-10-27T02:30:00Z') })
    const response = await lateApp.inject({ method: 'GET', url: '/v1/stats/today' })
    expect(response.json<StatsResponse>().to).toBe('2026-10-26')
    await lateApp.close()
  })

  it.each(['days=0', 'days=31', 'days=1.5'])('rejects %s', async (query) => {
    const { status } = await get(`/v1/stats/today?${query}`)
    expect(status).toBe(400)
  })
})

describe('catalog endpoints', () => {
  it('lists the checkers with their counts', async () => {
    const { body } = await get<CheckerWithCount[]>('/v1/checkers')
    expect(body).toHaveLength(7)
    expect(Object.fromEntries(body.map((checker) => [checker.id, checker.count]))).toEqual({
      lupa: 2,
      'aos-fatos': 1,
      'estadao-verifica': 2,
      'uol-confere': 1,
      'afp-checamos': 1,
      comprova: 1,
      'g1-fato-ou-fake': 2,
    })
  })

  it('lists the themes with review counts', async () => {
    const { body } = await get<ThemeWithCount[]>('/v1/themes')
    const saude = body.find((theme) => theme.slug === 'saude')
    expect(saude).toEqual({ slug: 'saude', name: 'Saúde', count: 1 })
  })

  it('lists elections newest first with campaign periods and counts', async () => {
    const { body } = await get<Election[]>('/v1/elections')
    expect(body.map((election) => election.year)).toEqual([
      2026, 2024, 2022, 2020, 2018, 2016, 2014,
    ])
    expect(body[0]).toMatchObject({
      campaignStart: '2026-08-16',
      campaignEnd: '2026-10-25',
      total: 5,
      counts: { false: 2, out_of_context: 2, true: 1, unknown: 0 },
    })
    expect(body.find((election) => election.year === 2020)).toMatchObject({
      campaignStart: '2020-09-27',
      total: 0,
    })
  })
})

describe('GET /v1/coverage', () => {
  it('reports checker × year rows and leaves gaps out', async () => {
    const { body } = await get<CoverageResponse>('/v1/coverage')
    expect(body.years[0]).toBe(2014)
    expect(body.years.at(-1)).toBe(2026)
    expect(body.checkers).toHaveLength(7)
    expect(body.rows.find((row) => row.checkerId === 'comprova')).toEqual({
      checkerId: 'comprova',
      year: 2024,
      count: 1,
      firstDate: '2024-09-09',
      lastDate: '2024-09-09',
      methods: ['claimreview'],
    })
    expect(body.rows.find((row) => row.checkerId === 'lupa' && row.year === 2024)).toBeUndefined()
    expect(body.rows.filter((row) => row.checkerId === 'estadao-verifica')).toEqual([
      expect.objectContaining({ year: 2018, count: 1 }),
    ])
  })
})

describe('exports', () => {
  it('exports every review with provenance as JSON', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/export.json' })
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="carimbo-checagens.json"',
    )
    const body = response.json<ReviewStore>()
    expect(body.reviews).toHaveLength(10)
    for (const review of body.reviews) expect(review.provenance.rawSha256).toMatch(/^[0-9a-f]{64}$/)
  })

  it('exports CSV with RFC 4180 escaping', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/export.csv' })
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toBe('text/csv; charset=utf-8')
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="carimbo-checagens.csv"',
    )
    const csv = response.body
    expect(csv.startsWith('﻿id,checkerId,claimText,')).toBe(true)
    expect(csv).toContain(
      '"Vacina contra a gripe causa ""paralisia"", diz post;\nsegunda linha, com vírgula"',
    )
    expect(csv).toContain(',"Perfil ""Saúde, já""",')
    expect(csv.endsWith('\r\n')).toBe(true)
    expect(csv.split('\r\n').filter((line) => line !== '')).toHaveLength(11)
  })

  it('escapes only what needs escaping', () => {
    expect(escapeCsv('simples')).toBe('simples')
    expect(escapeCsv('a,b')).toBe('"a,b"')
    expect(escapeCsv('diz "isso"')).toBe('"diz ""isso"""')
    expect(escapeCsv('linha\r\nnova')).toBe('"linha\r\nnova"')
  })
})

describe('HTTP behaviour', () => {
  it('allows the web origin through CORS', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/checkers',
      headers: { origin: 'http://localhost:3000' },
    })
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000')
  })

  it('publishes the OpenAPI document', async () => {
    const { status, body } = await get<{ openapi: string; paths: Record<string, unknown> }>(
      '/docs/json',
    )
    expect(status).toBe(200)
    expect(Object.keys(body.paths)).toEqual(
      expect.arrayContaining(['/v1/claims', '/v1/claims/{slug}', '/v1/search', '/v1/export.csv']),
    )
  })
})

describe('store file', () => {
  let dir: string

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'carimbo-api-'))
  })

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('serves an empty store when the file is missing', async () => {
    const emptyApp = buildApp({ dataFile: join(dir, 'missing.json') })
    const page = (await emptyApp.inject({ method: 'GET', url: '/v1/claims' })).json<
      Page<ClaimSummary>
    >()
    const stats = (
      await emptyApp.inject({ method: 'GET', url: '/v1/stats/today' })
    ).json<StatsResponse>()
    expect(page).toEqual({ items: [], total: 0, nextCursor: null })
    expect(stats.updatedAt).toBeNull()
    await emptyApp.close()
  })

  it('reloads when the file mtime changes and keeps the last good store on bad input', async () => {
    const file = join(dir, 'reviews.json')
    await copyFile(FIXTURE, file)
    const liveApp = buildApp({ dataFile: file, now: () => NOW })
    const total = async (): Promise<number> =>
      (await liveApp.inject({ method: 'GET', url: '/v1/claims' })).json<Page<ClaimSummary>>().total
    expect(await total()).toBe(9)

    const store: ReviewStore = {
      schemaVersion: 1,
      generatedAt: '2026-10-27T00:00:00Z',
      reviews: [],
    }
    await writeFile(file, JSON.stringify(store))
    await utimes(file, new Date(), new Date(Date.now() + 10_000))
    expect(await total()).toBe(0)

    await copyFile(FIXTURE, file)
    await utimes(file, new Date(), new Date(Date.now() + 20_000))
    expect(await total()).toBe(9)

    await writeFile(file, '{"schemaVersion":1,"reviews":[{"id":"sem-proveniencia"}]}')
    await utimes(file, new Date(), new Date(Date.now() + 30_000))
    expect(await total()).toBe(9)
    await liveApp.close()
  })
})
