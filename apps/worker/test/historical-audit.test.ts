import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import type { Review } from '@carimbo/core'
import { auditHistorical, selectSample } from '../scripts/historical-audit.js'

const url = 'https://example.org/check'
const html = `<script type="application/ld+json">${JSON.stringify({ '@type': 'ClaimReview', url, claimReviewed: 'A claim', datePublished: '2022-10-01', reviewRating: { alternateName: 'Falso' } })}</script>`
const hash = createHash('sha256').update(html).digest('hex')
function review(overrides: Partial<Review> = {}): Review {
  return {
    id: 'one',
    checkerId: 'checker',
    claimText: 'A claim',
    claimant: null,
    claimDate: null,
    reviewDate: '2022-10-01',
    reviewUrl: url,
    headline: null,
    textualRating: 'Falso',
    verdict: 'false',
    ratingMapVersion: 3,
    archivedUrl: null,
    provenance: {
      sourceUrl: url,
      fetchedAt: '2022-10-02T00:00:00Z',
      method: 'claimreview',
      parserVersion: 'claimreview@1',
      rawSha256: hash,
    },
    ...overrides,
  }
}

describe('historical audit', () => {
  it('samples at most 20 per checker and campaign independently of input order', () => {
    const rows = Array.from({ length: 30 }, (_, i) => review({ id: String(i) }))
    const forward = selectSample(rows).map((item) => item.review.id)
    expect(forward).toHaveLength(20)
    expect(selectSample([...rows].reverse()).map((item) => item.review.id)).toEqual(forward)
    expect(selectSample([review({ reviewDate: '2022-01-01' })])).toHaveLength(0)
  })

  it('compares actual extraction, reports mismatches and unavailable files without exposing text', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'carimbo-audit-'))
    try {
      await mkdir(join(dir, 'checker'))
      await writeFile(join(dir, 'checker', `${hash}.html.gz`), gzipSync(html))
      const missing = review({
        id: 'missing',
        provenance: { ...review().provenance, rawSha256: 'a'.repeat(64) },
      })
      const divergent = review({ id: 'changed', textualRating: 'Different' })
      const result = await auditHistorical([review(), divergent, missing], dir, {})
      expect(result.summary).toMatchObject({
        selected: 3,
        matched: 1,
        divergent: 1,
        unavailable: 1,
      })
      expect(result.divergences[0]?.fields).toEqual(['textualRating'])
      expect(result.unavailable[0]?.reason).toBe('raw_missing')
      expect(JSON.stringify(result)).not.toContain('A claim')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('reports corrupted content and avoids guessing between multiple reviews', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'carimbo-audit-'))
    try {
      await mkdir(join(dir, 'checker'))
      await writeFile(join(dir, 'checker', `${hash}.html.gz`), gzipSync('different'))
      const result = await auditHistorical([review()], dir, {})
      expect(result.divergences[0]?.fields).toEqual(['rawSha256'])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
