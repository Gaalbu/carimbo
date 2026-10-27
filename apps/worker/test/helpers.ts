import type { Review, ReviewStore } from '@carimbo/core'
import type { FetchedResource } from '@carimbo/sources'

import type { Logger, PageFetcher } from '../src/queues.js'
import type { FetchRecord, RawStore } from '../src/raw-store.js'

export const FETCHED_AT = '2026-10-26T12:00:00.000Z'

/** A fetcher serving fixed bodies by URL; anything else is a 404. */
export function fakeFetcher(pages: Readonly<Record<string, string>>): PageFetcher & {
  readonly requested: string[]
} {
  const requested: string[] = []
  return {
    requested,
    get(url: string): Promise<FetchedResource> {
      requested.push(url)
      const text = pages[url]
      if (text === undefined) return Promise.reject(new Error(`HTTP 404 em ${url}`))
      return Promise.resolve(resource(url, text))
    },
  }
}

export function resource(url: string, text: string): FetchedResource {
  return {
    url,
    finalUrl: url,
    status: 200,
    contentType: 'text/html; charset=utf-8',
    body: new TextEncoder().encode(text),
    text,
    fetchedAt: FETCHED_AT,
  }
}

export function memoryRawStore(): RawStore & { readonly saved: string[] } {
  const index = new Map<string, FetchRecord>()
  const saved: string[] = []
  return {
    saved,
    saveRaw(checkerId, rawSha256, _body, extension) {
      saved.push(`${checkerId}/${rawSha256}.${extension}.gz`)
      return Promise.resolve()
    },
    getFetch: (url) => index.get(url),
    recordFetch: (url, record) => {
      index.set(url, record)
    },
    flush: () => Promise.resolve(),
  }
}

export function memoryLog(): Logger & { readonly lines: string[] } {
  const lines: string[] = []
  return {
    lines,
    info: (message) => lines.push(`info ${message}`),
    warn: (message) => lines.push(`warn ${message}`),
  }
}

export function storeOf(reviews: readonly Review[]): ReviewStore {
  return { schemaVersion: 1, generatedAt: FETCHED_AT, reviews }
}

export function claimReviewPage(review: Record<string, unknown>, ...extra: object[]): string {
  const blocks = [{ '@context': 'https://schema.org', '@type': 'ClaimReview', ...review }, ...extra]
    .map((block) => `<script type="application/ld+json">${JSON.stringify(block)}</script>`)
    .join('')
  return `<html><head>${blocks}</head><body></body></html>`
}

export function rss(...links: string[]): string {
  const items = links
    .map(
      (link) =>
        `<item><link>${link}</link><pubDate>Mon, 26 Oct 2026 10:00:00 +0000</pubDate></item>`,
    )
    .join('')
  return `<?xml version="1.0"?><rss version="2.0"><channel><title>x</title>${items}</channel></rss>`
}

export function urlset(...entries: [string, string][]): string {
  const urls = entries
    .map(([loc, lastmod]) => `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join('')
  return `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
}

export function sitemapIndex(...locs: string[]): string {
  const children = locs.map((loc) => `<sitemap><loc>${loc}</loc></sitemap>`).join('')
  return `<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${children}</sitemapindex>`
}
