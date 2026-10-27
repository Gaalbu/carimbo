import { absoluteUrl } from './feed.js'
import { asArray, isRecord, parseXml, textOf, toInstant } from './xml.js'

export interface SitemapEntry {
  readonly loc: string
  /** ISO instant from `<lastmod>` (or Google News `publication_date`); null when absent. */
  readonly lastmod: string | null
}

export type Sitemap =
  | { readonly kind: 'index'; readonly entries: readonly SitemapEntry[] }
  | { readonly kind: 'urlset'; readonly entries: readonly SitemapEntry[] }

export class SitemapFormatError extends Error {
  override readonly name = 'SitemapFormatError'
}

/** Reads a sitemap index (list of sitemaps) or a urlset (list of pages), for backfill. */
export function parseSitemap(xml: string, sitemapUrl: string): Sitemap {
  const root = parseXml(xml)
  const index = root.sitemapindex
  if (isRecord(index)) return { kind: 'index', entries: entriesOf(index.sitemap, sitemapUrl) }
  const urlset = root.urlset
  if (isRecord(urlset)) return { kind: 'urlset', entries: entriesOf(urlset.url, sitemapUrl) }
  // An empty urlset parses to an empty string.
  if (root.urlset === '') return { kind: 'urlset', entries: [] }
  throw new SitemapFormatError(`não é um sitemap: ${sitemapUrl}`)
}

function entriesOf(value: unknown, sitemapUrl: string): readonly SitemapEntry[] {
  const entries: SitemapEntry[] = []
  for (const entry of asArray(value)) {
    if (!isRecord(entry)) continue
    const loc = absoluteUrl(textOf(entry.loc), sitemapUrl)
    if (loc === null) continue
    const news = entry['news:news']
    const published = isRecord(news) ? textOf(news['news:publication_date']) : null
    entries.push({ loc, lastmod: toInstant(textOf(entry.lastmod) ?? published) })
  }
  return entries
}
