import type { Manifest, ManifestEntry } from './raw-store.js'

/** A verified publication year for this exact checker and manifest page URL. */
export interface PublicationYearEvidence {
  readonly checkerId: string
  readonly url: string
  readonly year: number
}

export interface CoverageReportRow {
  readonly checkerId: string
  readonly year: number
  entries: number
  discovered: number
  processed: number
  withoutMarkup: number
  failed: number
  readonly investigation: null
}

export interface CoverageReport {
  readonly version: 1
  readonly rows: readonly CoverageReportRow[]
  readonly unattributed: {
    readonly pageEntries: number
    readonly discoveryEntries: number
    readonly runs: number
  }
}

/** Aggregate manifest entries only when their publication year is explicitly evidenced. */
export function buildCoverageReport(
  manifest: Manifest,
  evidence: readonly PublicationYearEvidence[],
): CoverageReport {
  const years = new Map<string, Set<number>>()
  for (const item of evidence) {
    const key = JSON.stringify([item.checkerId, item.url])
    const values = years.get(key) ?? new Set<number>()
    values.add(item.year)
    years.set(key, values)
  }
  const rows = new Map<string, CoverageReportRow>()
  let pageEntries = 0
  let discoveryEntries = 0
  for (const entry of manifest.entries) {
    if (entry.kind === 'discovery') {
      discoveryEntries++
      continue
    }
    const candidates = years.get(JSON.stringify([entry.checkerId, entry.url]))
    const year = candidates?.size === 1 ? candidates.values().next().value : undefined
    if (year === undefined || !Number.isInteger(year) || year < 1 || year > 9999) {
      pageEntries++
      continue
    }
    const key = JSON.stringify([entry.checkerId, year])
    const row = rows.get(key) ?? {
      checkerId: entry.checkerId,
      year,
      entries: 0,
      discovered: 0,
      processed: 0,
      withoutMarkup: 0,
      failed: 0,
      investigation: null,
    }
    row.entries++
    countStatus(row, entry.status)
    rows.set(key, row)
  }
  return {
    version: 1,
    rows: [...rows.values()].sort(
      (a, b) => a.checkerId.localeCompare(b.checkerId, 'en') || a.year - b.year,
    ),
    unattributed: { pageEntries, discoveryEntries, runs: manifest.runs.length },
  }
}

function countStatus(row: CoverageReportRow, status: ManifestEntry['status']): void {
  switch (status) {
    case 'discovered':
      row.discovered++
      break
    case 'processed':
      row.processed++
      break
    case 'without_markup':
      row.withoutMarkup++
      break
    case 'failed':
      row.failed++
      break
  }
}
