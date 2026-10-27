import { mkdtemp, readFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CHECKER_IDS, type ReviewStore } from '@carimbo/core'
import { reviewIdFor } from '@carimbo/sources'
import { describe, expect, it } from 'vitest'

import { CHECKER_SOURCES, type CheckerSource } from '../src/checkers.js'
import { runIngest, type IngestOptions } from '../src/ingest.js'
import { formatSummary, parseCliArgs } from '../src/main.js'
import { openRawStore } from '../src/raw-store.js'
import { readStore, writeStore } from '../src/store.js'
import { claimReviewPage, fakeFetcher, memoryLog, memoryRawStore, rss, storeOf } from './helpers.js'

const SOURCES: CheckerSource[] = [
  {
    checkerId: 'aos-fatos',
    status: 'active',
    recent: [{ kind: 'rss', url: 'https://aos.test/feed/' }],
    backfill: null,
    factCheckSite: null,
  },
  {
    checkerId: 'lupa',
    status: 'no-claimreview',
    recent: [{ kind: 'rss', url: 'https://lupa.test/feed/' }],
    backfill: null,
    factCheckSite: null,
  },
]

const PAGES = {
  'https://aos.test/feed/': rss(
    'https://aos.test/falso/',
    'https://aos.test/subestimado/',
    'https://aos.test/opiniao/',
    'https://aos.test/quebrada/',
  ),
  'https://aos.test/falso/': claimReviewPage({
    claimReviewed: 'Lula passou mal',
    datePublished: '2026-10-23',
    reviewRating: { alternateName: 'falso', ratingValue: 1 },
    itemReviewed: { author: { name: 'desinformação' }, datePublished: '2026-10-22' },
  }),
  'https://aos.test/subestimado/': claimReviewPage({
    claimReviewed: 'Desemprego é de 5%',
    reviewRating: { alternateName: 'subestimado' },
  }),
  'https://aos.test/opiniao/': '<html><body>sem JSON-LD</body></html>',
  'https://aos.test/quebrada/':
    '<script type="application/ld+json">{"@type": "ClaimReview",</script>',
  'https://lupa.test/feed/': rss('https://lupa.test/a/'),
}

const OPTIONS: IngestOptions = { since: null, maxPages: null, refresh: false, checkerIds: null }

function setup(initial: ReviewStore = storeOf([])) {
  let saved = initial
  const fetcher = fakeFetcher(PAGES)
  const rawStore = memoryRawStore()
  const log = memoryLog()
  const deps = {
    fetcher,
    rawStore,
    log,
    sources: SOURCES,
    now: () => new Date('2026-10-26T15:00:00Z'),
    loadStore: () => Promise.resolve(saved),
    saveStore: (store: ReviewStore) => {
      saved = store
      return Promise.resolve()
    },
  }
  return { deps, fetcher, rawStore, log, stored: () => saved }
}

describe('runIngest', () => {
  it('ingests active checkers, logging unknown ratings and parse failures', async () => {
    const { deps, fetcher, rawStore, log, stored } = setup()

    const summary = await runIngest(OPTIONS, deps)

    expect(fetcher.requested).not.toContain('https://lupa.test/feed/')
    expect(stored().generatedAt).toBe('2026-10-26T15:00:00.000Z')
    expect(stored().reviews.map((review) => [review.reviewUrl, review.verdict])).toEqual([
      ['https://aos.test/falso/', 'false'],
      ['https://aos.test/subestimado/', 'unknown'],
    ])
    expect(stored().reviews[0]).toMatchObject({
      id: reviewIdFor('https://aos.test/falso/'),
      checkerId: 'aos-fatos',
      claimant: 'desinformação',
      claimDate: '2026-10-22',
      reviewDate: '2026-10-23',
      ratingMapVersion: 1,
      archivedUrl: null,
    })
    // No date in the ClaimReview and no Article: stays missing.
    expect(stored().reviews[1]?.reviewDate).toBeNull()
    expect(summary.checkers['aos-fatos']).toEqual({
      candidates: 4,
      skipped: 0,
      fetched: 4,
      failed: 0,
      withoutClaimReview: 2,
      reviews: 2,
    })
    expect([...summary.unknownRatings]).toEqual([['aos-fatos: subestimado', 1]])
    expect(summary.parseFailures).toBe(1)
    expect(rawStore.saved).toHaveLength(4)
    const warnings = log.lines.filter((line) => line.startsWith('warn'))
    expect(warnings.some((line) => line.includes('avaliação desconhecida "subestimado"'))).toBe(
      true,
    )
    expect(warnings.some((line) => line.includes('JSON-LD inválido'))).toBe(true)
    expect(formatSummary(summary)).toMatch(/1× aos-fatos: subestimado/)
  })

  it('fetches each page only once across runs, unless --refresh', async () => {
    const { deps, fetcher } = setup()
    await runIngest(OPTIONS, deps)
    fetcher.requested.length = 0

    const again = await runIngest(OPTIONS, deps)
    expect(fetcher.requested).toEqual(['https://aos.test/feed/'])
    expect(again.checkers['aos-fatos']?.skipped).toBe(4)
    expect(again.added).toBe(0)

    fetcher.requested.length = 0
    const refreshed = await runIngest({ ...OPTIONS, refresh: true }, deps)
    expect(fetcher.requested).toHaveLength(5)
    expect(refreshed.updated).toBe(2)
  })

  it('respects --max-pages and --checker', async () => {
    const { deps, fetcher } = setup()
    await runIngest({ ...OPTIONS, maxPages: 1, checkerIds: ['aos-fatos', 'lupa'] }, deps)

    expect(fetcher.requested).toEqual([
      'https://aos.test/feed/',
      'https://lupa.test/feed/',
      'https://aos.test/falso/',
      'https://lupa.test/a/',
    ])
  })

  it('rejects an unknown checker id', async () => {
    const { deps } = setup()
    await expect(runIngest({ ...OPTIONS, checkerIds: ['inventado'] }, deps)).rejects.toThrow(
      /checador desconhecido/,
    )
  })
})

describe('checker sources', () => {
  it('use exactly the ids of the core catalog', () => {
    expect(CHECKER_SOURCES.map((source) => source.checkerId).sort()).toEqual(
      [...CHECKER_IDS].sort(),
    )
  })
})

describe('store files', () => {
  it('round-trips reviews.json and keeps raw pages gzipped with a fetch index', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'carimbo-worker-'))
    const path = join(dir, 'reviews.json')
    expect((await readStore(path)).reviews).toEqual([])

    const store = storeOf([])
    await writeStore(path, store)
    expect(await readStore(path)).toEqual(store)
    expect(await readFile(path, 'utf8')).toMatch(/\n$/)

    const raw = await openRawStore(join(dir, 'raw'))
    await raw.saveRaw('comprova', 'abc', new TextEncoder().encode('<html/>'), 'html')
    raw.recordFetch('https://x/', {
      checkerId: 'comprova',
      fetchedAt: '2026-10-26T00:00:00.000Z',
      finalUrl: 'https://x/',
      rawSha256: 'abc',
      reviewIds: [],
    })
    await raw.flush()
    expect(await readdir(join(dir, 'raw', 'comprova'))).toEqual(['abc.html.gz'])
    expect((await openRawStore(join(dir, 'raw'))).getFetch('https://x/')?.rawSha256).toBe('abc')
  })
})

describe('parseCliArgs', () => {
  it('reads the flags', () => {
    const args = parseCliArgs([
      '--since',
      '2026-08-16',
      '--max-pages',
      '50',
      '--refresh',
      '--checker',
      'comprova',
      '--checker',
      'aos-fatos',
    ])
    expect(args).toMatchObject({
      since: '2026-08-16',
      maxPages: 50,
      refresh: true,
      checkerIds: ['comprova', 'aos-fatos'],
    })
    expect(args.dataDir).toMatch(/data$/)
  })

  it('rejects malformed values', () => {
    expect(() => parseCliArgs(['--since', '16/08/2026'])).toThrow(/AAAA-MM-DD/)
    expect(() => parseCliArgs(['--max-pages', 'muitas'])).toThrow(/inteiro/)
  })
})
