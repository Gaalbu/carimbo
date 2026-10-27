import { describe, expect, it } from 'vitest'

import { FeedFormatError, parseFeed } from '../src/index.js'

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Checador</title>
    <link>https://example.org/</link>
    <item>
      <title><![CDATA[É falso que X]]></title>
      <link>https://example.org/checagem-1/</link>
      <pubDate>Mon, 26 Oct 2026 19:36:44 +0000</pubDate>
    </item>
    <item>
      <link>/checagem-2/</link>
      <dc:date>2026-10-25T10:00:00-03:00</dc:date>
    </item>
    <item>
      <guid isPermaLink="true">https://example.org/checagem-3/</guid>
    </item>
    <item>
      <guid isPermaLink="false">abc-123</guid>
    </item>
  </channel>
</rss>`

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Checador</title>
  <entry>
    <link rel="enclosure" href="https://example.org/foto.jpg"/>
    <link rel="alternate" href="https://example.org/a/"/>
    <published>2026-10-20T08:00:00Z</published>
  </entry>
  <entry>
    <link href="https://example.org/b/"/>
    <updated>não é data</updated>
  </entry>
</feed>`

describe('parseFeed', () => {
  it('reads links and dates of an RSS 2.0 feed', () => {
    expect(parseFeed(RSS, 'https://example.org/feed/')).toEqual([
      { link: 'https://example.org/checagem-1/', publishedAt: '2026-10-26T19:36:44.000Z' },
      { link: 'https://example.org/checagem-2/', publishedAt: '2026-10-25T13:00:00.000Z' },
      { link: 'https://example.org/checagem-3/', publishedAt: null },
    ])
  })

  it('reads the alternate link of Atom entries', () => {
    expect(parseFeed(ATOM, 'https://example.org/atom')).toEqual([
      { link: 'https://example.org/a/', publishedAt: '2026-10-20T08:00:00.000Z' },
      { link: 'https://example.org/b/', publishedAt: null },
    ])
  })

  it('handles a feed with a single item', () => {
    const single = '<rss><channel><item><link>https://example.org/x</link></item></channel></rss>'
    expect(parseFeed(single, 'https://example.org/')).toHaveLength(1)
  })

  it('rejects documents that are not feeds', () => {
    expect(() => parseFeed('<html><body/></html>', 'https://example.org/')).toThrow(FeedFormatError)
  })
})
