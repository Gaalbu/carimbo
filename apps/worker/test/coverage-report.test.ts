import { describe, expect, it } from 'vitest'

import { buildCoverageReport } from '../src/coverage-report.js'
import type { Manifest, ManifestEntry } from '../src/raw-store.js'

const page = (overrides: Partial<ManifestEntry> = {}): ManifestEntry => ({
  checkerId: 'checker',
  since: '2020-01-01',
  url: 'https://example.org/a',
  kind: 'page',
  status: 'processed',
  diagnostics: ['private detail'],
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('buildCoverageReport', () => {
  it('attributes only explicitly evidenced page entries and never publishes private details', () => {
    const manifest: Manifest = {
      entries: [
        page(),
        page({ url: 'https://example.org/b', status: 'failed' }),
        page({ kind: 'discovery' }),
      ],
      runs: [],
    }
    const report = buildCoverageReport(manifest, [
      { checkerId: 'checker', url: 'https://example.org/a', year: 2018 },
    ])
    expect(report.rows).toEqual([
      {
        checkerId: 'checker',
        year: 2018,
        entries: 1,
        discovered: 0,
        processed: 1,
        withoutMarkup: 0,
        failed: 0,
        investigation: null,
      },
    ])
    expect(report.unattributed).toEqual({ pageEntries: 1, discoveryEntries: 1, runs: 0 })
    expect(JSON.stringify(report)).not.toContain('example.org')
    expect(JSON.stringify(report)).not.toContain('private detail')
  })

  it('leaves missing, conflicting and invalid year evidence unattributed', () => {
    const manifest: Manifest = {
      entries: [
        page(),
        page({ url: 'https://example.org/b', status: 'discovered' }),
        page({ url: 'https://example.org/c', status: 'without_markup' }),
      ],
      runs: [],
    }
    const report = buildCoverageReport(manifest, [
      { checkerId: 'checker', url: 'https://example.org/a', year: 2018 },
      { checkerId: 'checker', url: 'https://example.org/a', year: 2019 },
      { checkerId: 'checker', url: 'https://example.org/b', year: 2020.5 },
      { checkerId: 'other', url: 'https://example.org/c', year: 2021 },
    ])
    expect(report.rows).toEqual([])
    expect(report.unattributed.pageEntries).toBe(3)
  })

  it('counts manifest entries including retries in distinct scopes and keeps runs unattributed', () => {
    const manifest: Manifest = {
      entries: [
        page({ status: 'failed' }),
        page({ since: null, status: 'without_markup' }),
        page({ checkerId: 'z', status: 'discovered' }),
      ],
      runs: [
        {
          id: 'secret',
          checkerId: 'checker',
          since: '2018-01-01',
          startedAt: '2026-01-01',
          status: 'finished',
          maxPages: null,
          truncated: false,
          parseFailures: 0,
          discoveryFailures: 0,
        },
      ],
    }
    const evidence = [
      { checkerId: 'checker', url: 'https://example.org/a', year: 2018 },
      { checkerId: 'z', url: 'https://example.org/a', year: 2020 },
    ]
    const report = buildCoverageReport(manifest, evidence)
    expect(
      report.rows.map(({ checkerId, year, entries, failed, withoutMarkup, discovered }) => ({
        checkerId,
        year,
        entries,
        failed,
        withoutMarkup,
        discovered,
      })),
    ).toEqual([
      { checkerId: 'checker', year: 2018, entries: 2, failed: 1, withoutMarkup: 1, discovered: 0 },
      { checkerId: 'z', year: 2020, entries: 1, failed: 0, withoutMarkup: 0, discovered: 1 },
    ])
    expect(report.unattributed.runs).toBe(1)
    expect(JSON.stringify(report)).not.toContain('secret')
  })
})
