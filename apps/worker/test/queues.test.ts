import type { Review } from '@carimbo/core'
import { describe, expect, it } from 'vitest'

import type { CheckerSource } from '../src/checkers.js'
import {
  canonicalUrl,
  dedupe,
  describePipeline,
  extract,
  normalize,
  POLL_INTERVAL_MS,
  pollSources,
  QUEUE_NAMES,
} from '../src/queues.js'
import {
  claimReviewPage,
  fakeFetcher,
  memoryLog,
  resource,
  rss,
  sitemapIndex,
  urlset,
} from './helpers.js'

const CHECKER: CheckerSource = {
  checkerId: 'estadao-verifica',
  status: 'active',
  recent: [{ kind: 'rss', url: 'https://example.org/feed/' }],
  backfill: {
    indexUrl: 'https://example.org/sitemap-index.xml',
    includeChild: (loc, since) => (/(\d{4}-\d{2}-\d{2})/.exec(loc)?.[1] ?? '') >= since,
    includePage: (loc) => new URL(loc).pathname.startsWith('/verifica/'),
  },
  factCheckSite: null,
}

describe('ingestion pipeline', () => {
  it('runs the stages in the order planned for F1', () => {
    expect(describePipeline()).toBe('poll-sources → extract → normalize → dedupe')
  })

  it('has one queue per stage', () => {
    expect(new Set(QUEUE_NAMES).size).toBe(QUEUE_NAMES.length)
  })

  it('polls the sources every 15 minutes', () => {
    expect(POLL_INTERVAL_MS).toBe(900_000)
  })
})

describe('pollSources', () => {
  const fetcher = fakeFetcher({
    'https://example.org/feed/': rss(
      'https://example.org/verifica/a/',
      'https://example.org/verifica/a/#comentarios',
    ),
    'https://example.org/sitemap-index.xml': sitemapIndex(
      'https://example.org/sitemap/2026-10-20.xml',
      'https://example.org/sitemap/2026-08-01.xml',
    ),
    'https://example.org/sitemap/2026-10-20.xml': urlset(
      ['https://example.org/verifica/b/', '2026-10-20T10:00:00Z'],
      ['https://example.org/esportes/c/', '2026-10-20T11:00:00Z'],
      ['https://example.org/verifica/a/', '2026-10-20T09:00:00Z'],
      ['https://example.org/verifica/velha/', '2026-08-10T09:00:00Z'],
    ),
  })

  it('lists the feed only, without since', async () => {
    const candidates = await pollSources(CHECKER, fetcher, { since: null }, memoryLog())
    expect(candidates.map((candidate) => candidate.url)).toEqual([
      'https://example.org/verifica/a/',
    ])
  })

  it('adds sitemap pages of this checker on or after since, skipping old children', async () => {
    fetcher.requested.length = 0
    const candidates = await pollSources(CHECKER, fetcher, { since: '2026-10-01' }, memoryLog())

    expect(candidates.map((candidate) => [candidate.url, candidate.via])).toEqual([
      ['https://example.org/verifica/a/', 'rss'],
      ['https://example.org/verifica/b/', 'sitemap'],
    ])
    expect(fetcher.requested).not.toContain('https://example.org/sitemap/2026-08-01.xml')
  })

  it('logs a broken listing and carries on', async () => {
    const log = memoryLog()
    const candidates = await pollSources(
      { ...CHECKER, recent: [{ kind: 'rss', url: 'https://example.org/sumiu/' }] },
      fetcher,
      { since: null },
      log,
    )
    expect(candidates).toEqual([])
    expect(log.lines.join('\n')).toMatch(/falha ao ler https:\/\/example.org\/sumiu\//)
  })
})

describe('extract + normalize', () => {
  const page = resource(
    'https://example.org/verifica/a/',
    claimReviewPage(
      {
        claimReviewed: 'Alegação',
        url: '/verifica/a/',
        reviewRating: { alternateName: 'Enganoso' },
      },
      { '@type': 'NewsArticle', datePublished: '2026-10-20T10:00:00-03:00', headline: 'Título' },
    ),
  )

  it('builds reviews with full provenance and the mapped stamp', () => {
    const { reviews, duplicates } = normalize(extract(page), page, 'estadao-verifica')

    expect(duplicates).toBe(0)
    expect(reviews).toHaveLength(1)
    expect(reviews[0]).toMatchObject({
      checkerId: 'estadao-verifica',
      reviewUrl: 'https://example.org/verifica/a/',
      reviewDate: '2026-10-20',
      headline: 'Título',
      textualRating: 'Enganoso',
      verdict: 'out_of_context',
      provenance: {
        sourceUrl: 'https://example.org/verifica/a/',
        fetchedAt: '2026-10-26T12:00:00.000Z',
        method: 'claimreview',
        parserVersion: 'claimreview@1',
      },
    })
    expect(reviews[0]?.provenance.rawSha256).toMatch(/^[0-9a-f]{64}$/)
  })

  it('keeps one review when two ClaimReviews share a url', () => {
    const block = {
      '@type': 'ClaimReview',
      claimReviewed: 'B',
      reviewRating: { alternateName: 'Falso' },
    }
    const twice = resource(
      'https://example.org/x',
      claimReviewPage({ claimReviewed: 'A', reviewRating: { alternateName: 'Falso' } }, block),
    )
    const { reviews, duplicates } = normalize(extract(twice), twice, 'comprova')
    expect(reviews.map((review) => review.claimText)).toEqual(['A'])
    expect(duplicates).toBe(1)
  })
})

describe('dedupe', () => {
  const review = (id: string, reviewDate: string | null, textualRating = 'Falso'): Review =>
    ({
      id,
      reviewDate,
      textualRating,
      checkerId: 'comprova',
      reviewUrl: `https://x/${id}`,
    }) as Review

  it('merges by id, newest first, undated last, ties by id', () => {
    const result = dedupe(
      [review('b', '2026-10-01'), review('z', null)],
      [review('a', '2026-10-01'), review('c', '2026-10-20'), review('b', '2026-10-01', 'Enganoso')],
    )

    expect(result.reviews.map((item) => item.id)).toEqual(['c', 'a', 'b', 'z'])
    expect(result.added).toBe(2)
    expect(result.updated).toBe(1)
    expect(result.ratingChanges).toHaveLength(1)
    expect(result.reviews.find((item) => item.id === 'b')?.textualRating).toBe('Enganoso')
  })

  it('keeps stored records when asked to', () => {
    const result = dedupe([review('a', null)], [review('a', null, 'Outro')], { keepExisting: true })
    expect(result.reviews[0]?.textualRating).toBe('Falso')
    expect(result.updated).toBe(0)
  })
})

describe('canonicalUrl', () => {
  it('drops the fragment and encodes the path', () => {
    expect(canonicalUrl('https://example.org/publicações/a/#x')).toBe(
      'https://example.org/publica%C3%A7%C3%B5es/a/',
    )
  })
})
