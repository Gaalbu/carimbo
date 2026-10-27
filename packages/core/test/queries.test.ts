import { describe, expect, it } from 'vitest'

import {
  addDays,
  buildSnapshot,
  checkersWithCounts,
  claimDetail,
  coverage,
  electionsWithCounts,
  EMPTY_SNAPSHOT,
  escapeCsv,
  exportJson,
  listClaims,
  saoPauloDay,
  searchSnapshot,
  statsForWindow,
  themesWithCounts,
  toCsv,
  type ReviewStore,
} from '../src/index.js'
import { makeReview } from './review-factory.js'

const URNA = 'Urna eletrônica foi fraudada no segundo turno em Minas Gerais'
const VACINA = 'Vacina contra gripe causa infertilidade em mulheres jovens'
const DEBATE = 'Lula passou mal e não irá ao debate da Globo no dia 23 de outubro de 2026'

const STORE: ReviewStore = {
  schemaVersion: 1,
  generatedAt: '2026-10-26T12:00:00.000Z',
  reviews: [
    makeReview({ id: 'a1', claimText: URNA, reviewDate: '2026-10-26', textualRating: 'Falso' }),
    makeReview({
      id: 'a2',
      claimText: URNA,
      checkerId: 'lupa',
      reviewDate: '2026-10-25',
      textualRating: 'Verdadeiro',
    }),
    makeReview({ id: 'b1', claimText: VACINA, reviewDate: '2026-10-20', checkerId: 'comprova' }),
    makeReview({ id: 'c1', claimText: DEBATE, reviewDate: '2022-10-10' }),
    makeReview({ id: 'd1', claimText: 'Alegação sem data nenhuma informada', reviewDate: null }),
    // Duplicate id: kept once.
    makeReview({ id: 'a1', claimText: URNA, reviewDate: '2026-10-26', textualRating: 'Falso' }),
  ],
}

// 12:00 in Brasília on 2026-10-26.
const NOW = new Date('2026-10-26T15:00:00Z')
const snapshot = buildSnapshot(STORE)

describe('buildSnapshot', () => {
  it('dedupes by id, groups and sorts newest first, undated last', () => {
    expect(snapshot.reviews).toHaveLength(5)
    expect(snapshot.claims.map((claim) => claim.latestReviewDate)).toEqual([
      '2026-10-26',
      '2026-10-20',
      '2022-10-10',
      null,
    ])
    expect(snapshot.claims[0]?.reviews).toHaveLength(2)
    for (const claim of snapshot.claims) expect(snapshot.claimsBySlug.get(claim.slug)).toBe(claim)
  })

  it('has an empty snapshot for a missing store', () => {
    expect(EMPTY_SNAPSHOT.generatedAt).toBeNull()
    expect(EMPTY_SNAPSHOT.claims).toEqual([])
  })
})

describe('listClaims', () => {
  it('paginates by offset', () => {
    const first = listClaims(snapshot, {}, 0, 3)
    expect(first.items).toHaveLength(3)
    expect(first.total).toBe(4)
    expect(first.nextOffset).toBe(3)
    const last = listClaims(snapshot, {}, 3, 3)
    expect(last.items).toHaveLength(1)
    expect(last.nextOffset).toBeNull()
  })

  it('keeps the whole group when one review matches', () => {
    const page = listClaims(snapshot, { verdict: 'true' }, 0, 10)
    expect(page.total).toBe(1)
    expect(page.items[0]?.reviews).toHaveLength(2)
  })

  it('filters by checker and election', () => {
    expect(listClaims(snapshot, { checker: 'comprova' }, 0, 10).total).toBe(1)
    const election = listClaims(snapshot, { election: 2022 }, 0, 10)
    expect(election.items.map((claim) => claim.latestReviewDate)).toEqual(['2022-10-10'])
    expect(listClaims(snapshot, { election: 1990 }, 0, 10).total).toBe(0)
  })
})

describe('claimDetail and searchSnapshot', () => {
  it('returns the group with related claims, or null', () => {
    const slug = snapshot.claims[0]?.slug ?? ''
    const detail = claimDetail(snapshot, slug)
    expect(detail?.slug).toBe(slug)
    expect(Array.isArray(detail?.related)).toBe(true)
    expect(claimDetail(snapshot, 'nao-existe')).toBeNull()
  })

  it('searches tolerating accents', () => {
    const result = searchSnapshot(snapshot, 'urna eletronica fraudada', 5)
    expect(result.query).toBe('urna eletronica fraudada')
    expect(result.items[0]?.claimText).toBe(URNA)
  })
})

describe('statsForWindow', () => {
  it('counts dated reviews in the window ending today in Brasília', () => {
    const today = statsForWindow(snapshot, NOW, 1)
    expect(today).toMatchObject({ from: '2026-10-26', to: '2026-10-26', total: 1, indexed: 5 })
    expect(today.counts.false).toBe(1)
    expect(today.updatedAt).toBe(STORE.generatedAt)
    expect(statsForWindow(snapshot, NOW, 7)).toMatchObject({ from: '2026-10-20', total: 3 })
  })

  it('uses the Brasília calendar day, not UTC', () => {
    // 01:00 UTC on the 27th is still the 26th in Brasília.
    expect(saoPauloDay(new Date('2026-10-27T01:00:00Z'))).toBe('2026-10-26')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('catalog counts', () => {
  it('counts reviews per checker, zero for checkers without data', () => {
    const counts = Object.fromEntries(checkersWithCounts(snapshot).map((c) => [c.id, c.count]))
    expect(counts).toMatchObject({ 'aos-fatos': 3, lupa: 1, comprova: 1, 'uol-confere': 0 })
  })

  it('counts reviews of the groups in each theme', () => {
    // The debate claim is tagged with the election theme too.
    const urna = themesWithCounts(snapshot).find((theme) => theme.slug === 'urna-e-eleicao')
    expect(urna?.count).toBe(3)
  })

  it('lists elections newest first with campaign counts', () => {
    const elections = electionsWithCounts(snapshot)
    expect(elections[0]?.year).toBeGreaterThan(elections.at(-1)?.year ?? 0)
    expect(elections.find((election) => election.year === 2022)?.total).toBe(1)
  })
})

describe('coverage', () => {
  it('spans 2014 to the current year with one row per checker and year', () => {
    const result = coverage(snapshot, NOW)
    expect(result.years[0]).toBe(2014)
    expect(result.years.at(-1)).toBe(2026)
    const aosFatos2026 = result.rows.find(
      (row) => row.checkerId === 'aos-fatos' && row.year === 2026,
    )
    expect(aosFatos2026).toMatchObject({
      count: 1,
      firstDate: '2026-10-26',
      lastDate: '2026-10-26',
      methods: ['claimreview'],
    })
    // Undated reviews have no year: no row.
    expect(result.rows.reduce((sum, row) => sum + row.count, 0)).toBe(4)
  })
})

describe('export', () => {
  it('serializes the JSON body with provenance', () => {
    const body = exportJson(snapshot)
    expect(body.schemaVersion).toBe(1)
    expect(body.reviews).toHaveLength(5)
  })

  it('writes CSV with BOM, CRLF and RFC 4180 quoting', () => {
    const csv = toCsv(snapshot.reviews)
    expect(csv.startsWith('﻿id,checkerId,claimText,')).toBe(true)
    const lines = csv.split('\r\n')
    expect(lines).toHaveLength(7)
    expect(lines.at(-1)).toBe('')
    expect(escapeCsv('a,"b"')).toBe('"a,""b"""')
    expect(escapeCsv('simples')).toBe('simples')
  })
})
