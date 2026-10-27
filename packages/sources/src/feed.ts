import { asArray, isRecord, parseXml, textOf, toInstant, type XmlRecord } from './xml.js'

export interface FeedItem {
  /** Absolute URL of the item. */
  readonly link: string
  /** ISO instant the feed says the item was published; null when absent or unreadable. */
  readonly publishedAt: string | null
}

export class FeedFormatError extends Error {
  override readonly name = 'FeedFormatError'
}

/**
 * Reads the item links and dates of an RSS 2.0, RSS 1.0 (RDF) or Atom feed. Item text is not
 * read: the worker only needs to know which pages to visit.
 */
export function parseFeed(xml: string, feedUrl: string): readonly FeedItem[] {
  const root = parseXml(xml)
  const rss = root.rss
  if (isRecord(rss)) return rssItems(rss.channel, feedUrl)
  const rdf = root['rdf:RDF']
  if (isRecord(rdf)) return toItems(asArray(rdf.item), rssLink, rssDate, feedUrl)
  const atom = root.feed
  if (isRecord(atom)) return toItems(asArray(atom.entry), atomLink, atomDate, feedUrl)
  throw new FeedFormatError(`não é um feed RSS/Atom: ${feedUrl}`)
}

function rssItems(channel: unknown, feedUrl: string): readonly FeedItem[] {
  const channels = asArray(channel).filter(isRecord)
  return channels.flatMap((entry) => toItems(asArray(entry.item), rssLink, rssDate, feedUrl))
}

function toItems(
  entries: readonly unknown[],
  linkOf: (entry: XmlRecord) => string | null,
  dateOf: (entry: XmlRecord) => string | null,
  feedUrl: string,
): readonly FeedItem[] {
  const items: FeedItem[] = []
  for (const entry of entries) {
    if (!isRecord(entry)) continue
    const link = absoluteUrl(linkOf(entry), feedUrl)
    if (link === null) continue
    items.push({ link, publishedAt: toInstant(dateOf(entry)) })
  }
  return items
}

function rssLink(entry: XmlRecord): string | null {
  // Some feeds only have a permalink guid.
  const link = textOf(entry.link)
  if (link !== null) return link
  const guid = entry.guid
  const isPermalink = !isRecord(guid) || guid['@_isPermaLink'] !== 'false'
  return isPermalink ? textOf(guid) : null
}

function rssDate(entry: XmlRecord): string | null {
  return textOf(entry.pubDate) ?? textOf(entry['dc:date'])
}

function atomLink(entry: XmlRecord): string | null {
  const links = asArray(entry.link).filter(isRecord)
  const alternate =
    links.find((link) => link['@_rel'] === undefined || link['@_rel'] === 'alternate') ?? links[0]
  const href = alternate?.['@_href']
  return typeof href === 'string' ? href : null
}

function atomDate(entry: XmlRecord): string | null {
  return textOf(entry.published) ?? textOf(entry.updated)
}

export function absoluteUrl(value: string | null, base: string): string | null {
  if (value === null) return null
  try {
    return new URL(value, base).href
  } catch {
    return null
  }
}
