import { describe, expect, it } from 'vitest'

import { parseSitemap, SitemapFormatError } from '../src/index.js'

describe('parseSitemap', () => {
  it('reads a sitemap index', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.org/sitemap/2026-10-26/?outputType=xml</loc></sitemap>
  <sitemap><loc>https://example.org/sitemap-2.xml</loc><lastmod>2026-10-01</lastmod></sitemap>
</sitemapindex>`

    expect(parseSitemap(xml, 'https://example.org/sitemap.xml')).toEqual({
      kind: 'index',
      entries: [
        { loc: 'https://example.org/sitemap/2026-10-26/?outputType=xml', lastmod: null },
        { loc: 'https://example.org/sitemap-2.xml', lastmod: '2026-10-01T00:00:00.000Z' },
      ],
    })
  })

  it('reads a urlset, encoding non-ASCII paths and using news dates', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url><loc>https://example.org/publicações/a/</loc><lastmod>2026-10-25T15:23:55-03:00</lastmod></url>
  <url><loc>https://example.org/b?x=1&amp;y=2</loc>
    <news:news><news:publication_date>2026-10-24T10:00:00Z</news:publication_date></news:news>
  </url>
</urlset>`

    expect(parseSitemap(xml, 'https://example.org/sitemap.xml')).toEqual({
      kind: 'urlset',
      entries: [
        {
          loc: 'https://example.org/publica%C3%A7%C3%B5es/a/',
          lastmod: '2026-10-25T18:23:55.000Z',
        },
        { loc: 'https://example.org/b?x=1&y=2', lastmod: '2026-10-24T10:00:00.000Z' },
      ],
    })
  })

  it('accepts an empty urlset and rejects other documents', () => {
    expect(parseSitemap('<urlset></urlset>', 'https://example.org/s.xml').entries).toEqual([])
    expect(() => parseSitemap('<html/>', 'https://example.org/s.xml')).toThrow(SitemapFormatError)
  })
})
