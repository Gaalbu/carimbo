const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/
const WAYBACK_TIMESTAMP = /web\.archive\.org\/web\/(\d{4})(\d{2})(\d{2})/

/**
 * `2026-10-24` (or an ISO instant) → `24/10/2026`. Parsed as text, not through `Date`, so the
 * server's time zone can never shift the day.
 */
export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null
  const match = ISO_DATE.exec(value)
  if (!match) return null
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

/** Missing dates are shown as missing, never replaced (docs/PLANO.md §4.4, regra 4). */
export function dateOrMissing(value: string | null | undefined): string {
  return formatDate(value) ?? 'data não informada'
}

/** Capture date of a Wayback Machine snapshot, read from its URL. */
export function archivedDate(archivedUrl: string): string | null {
  const match = WAYBACK_TIMESTAMP.exec(archivedUrl)
  if (!match) return null
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

export function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR')
}

/** `2026-10-26T12:30:00Z` → `26/10/2026 às 09:30` in Brasília time. */
export function formatInstant(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('day')}/${get('month')}/${get('year')} às ${get('hour')}:${get('minute')}`
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}
