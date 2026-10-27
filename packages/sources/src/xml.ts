import { XMLParser } from 'fast-xml-parser'

// Elements that repeat in feeds and sitemaps; forcing arrays keeps a one-item feed the same shape.
const REPEATED_ELEMENTS: ReadonlySet<string> = new Set(['item', 'entry', 'link', 'url', 'sitemap'])

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  isArray: (name) => REPEATED_ELEMENTS.has(name),
})

export type XmlRecord = Readonly<Record<string, unknown>>

export function parseXml(xml: string): XmlRecord {
  const parsed: unknown = parser.parse(xml)
  return isRecord(parsed) ? parsed : {}
}

export function isRecord(value: unknown): value is XmlRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function asArray(value: unknown): readonly unknown[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

/** Text content of an element, whether it was parsed as a plain value or with attributes. */
export function textOf(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim()
  if (typeof value === 'number') return String(value)
  if (isRecord(value)) return textOf(value['#text'])
  if (Array.isArray(value)) return textOf(value[0])
  return null
}

/** ISO instant of an RSS/Atom/sitemap date, or null when it cannot be read. */
export function toInstant(value: string | null): string | null {
  if (value === null) return null
  const time = Date.parse(value)
  return Number.isNaN(time) ? null : new Date(time).toISOString()
}
