import {
  CHECKER_IDS,
  checkersWithCounts,
  claimDetail,
  coverage,
  ELECTION_YEARS,
  electionsWithCounts,
  listClaims,
  searchSnapshot,
  statsForWindow,
  THEME_SLUGS,
  themesWithCounts,
  VERDICTS,
  type ClaimFilters,
  type ClaimSummary,
  type Page,
  type StoreSnapshot,
  type Verdict,
} from '@carimbo/core'

/**
 * The API routes answered in the browser from the published store file, for the static build
 * (GitHub Pages). Same paths, query parameters, limits and response shapes as apps/api; errors
 * carry the same status codes.
 */

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100
const DEFAULT_SEARCH_SIZE = 20
const MAX_SEARCH_SIZE = 50
const MIN_QUERY_LENGTH = 3
const MAX_QUERY_LENGTH = 500
const MAX_STATS_DAYS = 30
const CURSOR_PREFIX = 'o:'

export type StaticQuery = Record<string, unknown>

export class StaticApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'StaticApiError'
  }
}

function badRequest(message: string): StaticApiError {
  return new StaticApiError(400, message)
}

/** Same cursor format as the API (base64url of `o:<offset>`), without Node's Buffer. */
export function encodeCursor(offset: number): string {
  return btoa(`${CURSOR_PREFIX}${String(offset)}`)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

export function decodeCursor(cursor: string): number | null {
  let decoded: string
  try {
    decoded = atob(cursor.replaceAll('-', '+').replaceAll('_', '/'))
  } catch {
    return null
  }
  if (!decoded.startsWith(CURSOR_PREFIX)) return null
  const offset = Number(decoded.slice(CURSOR_PREFIX.length))
  return Number.isSafeInteger(offset) && offset >= 0 ? offset : null
}

function text(query: StaticQuery, name: string): string | undefined {
  const value = query[name]
  if (value === undefined || value === null || value === '') return undefined
  return String(value)
}

function integer(
  query: StaticQuery,
  name: string,
  { min, max, fallback }: { min: number; max: number; fallback: number },
): number {
  const raw = text(query, name)
  if (raw === undefined) return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < min || value > max) {
    throw badRequest(`Parâmetros inválidos. ${name}`)
  }
  return value
}

function oneOf<T extends string>(
  query: StaticQuery,
  name: string,
  allowed: readonly T[],
): T | undefined {
  const raw = text(query, name)
  if (raw === undefined) return undefined
  if (!(allowed as readonly string[]).includes(raw))
    throw badRequest(`Parâmetros inválidos. ${name}`)
  return raw as T
}

function claimFilters(query: StaticQuery): ClaimFilters {
  const election = text(query, 'election')
  const year = election === undefined ? undefined : Number(election)
  if (year !== undefined && !ELECTION_YEARS.includes(year)) {
    throw badRequest(`Eleição deve ser um destes anos: ${ELECTION_YEARS.join(', ')}`)
  }
  return {
    verdict: oneOf<Verdict>(query, 'verdict', VERDICTS),
    checker: oneOf(query, 'checker', CHECKER_IDS),
    theme: oneOf(query, 'theme', THEME_SLUGS),
    election: year,
  }
}

function claimsPage(snapshot: StoreSnapshot, query: StaticQuery): Page<ClaimSummary> {
  const cursor = text(query, 'cursor')
  const offset = cursor === undefined ? 0 : decodeCursor(cursor)
  if (offset === null) throw badRequest('Cursor inválido')
  const limit = integer(query, 'limit', { min: 1, max: MAX_PAGE_SIZE, fallback: DEFAULT_PAGE_SIZE })
  const page = listClaims(snapshot, claimFilters(query), offset, limit)
  return {
    items: page.items,
    total: page.total,
    nextCursor: page.nextOffset === null ? null : encodeCursor(page.nextOffset),
  }
}

function search(snapshot: StoreSnapshot, query: StaticQuery) {
  const q = (text(query, 'q') ?? '').trim()
  if (q.length < MIN_QUERY_LENGTH) {
    throw badRequest(`A busca precisa de pelo menos ${String(MIN_QUERY_LENGTH)} caracteres`)
  }
  if (q.length > MAX_QUERY_LENGTH) throw badRequest('Parâmetros inválidos. q')
  const limit = integer(query, 'limit', {
    min: 1,
    max: MAX_SEARCH_SIZE,
    fallback: DEFAULT_SEARCH_SIZE,
  })
  return searchSnapshot(snapshot, q, limit)
}

const CLAIM_PATH = /^\/v1\/claims\/([^/]+)$/

/** Answers one GET of the API. Throws `StaticApiError` with the API's status codes. */
export function resolveStaticApi(
  snapshot: StoreSnapshot,
  path: string,
  query: StaticQuery,
  now: Date,
): unknown {
  const pathname = path.split('?')[0] ?? path
  switch (pathname) {
    case '/v1/claims':
      return claimsPage(snapshot, query)
    case '/v1/search':
      return search(snapshot, query)
    case '/v1/stats/today':
      return statsForWindow(
        snapshot,
        now,
        integer(query, 'days', { min: 1, max: MAX_STATS_DAYS, fallback: 1 }),
      )
    case '/v1/checkers':
      return checkersWithCounts(snapshot)
    case '/v1/themes':
      return themesWithCounts(snapshot)
    case '/v1/elections':
      return electionsWithCounts(snapshot)
    case '/v1/coverage':
      return coverage(snapshot, now)
  }
  const slug = CLAIM_PATH.exec(pathname)?.[1]
  if (slug !== undefined) {
    const detail = claimDetail(snapshot, decodeURIComponent(slug))
    if (detail === null) throw new StaticApiError(404, 'Alegação não encontrada')
    return detail
  }
  throw new StaticApiError(404, 'Rota não encontrada')
}
