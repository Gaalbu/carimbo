import {
  CHECKER_IDS,
  ELECTION_YEARS,
  findElection,
  findRelated,
  isInCampaign,
  THEME_SLUGS,
  VERDICTS,
  type ClaimDetail,
  type ClaimSummary,
  type Page,
  type SearchResult,
} from '@carimbo/core'
import { z } from 'zod'

import { sendError } from '../http.js'
import type { RouteDeps, ZodApp } from './deps.js'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100
const DEFAULT_SEARCH_SIZE = 20
const MAX_SEARCH_SIZE = 50
const MIN_QUERY_LENGTH = 3
const MAX_QUERY_LENGTH = 500
const CURSOR_PREFIX = 'o:'

const claimsQuerySchema = z.object({
  verdict: z.enum(VERDICTS).optional().describe('Carimbo normalizado'),
  checker: z.enum(CHECKER_IDS).optional().describe('Id do checador'),
  theme: z.enum(THEME_SLUGS).optional().describe('Slug do tema (filtro de assunto, não veredito)'),
  election: z.coerce
    .number()
    .int()
    .refine((year) => ELECTION_YEARS.includes(year), {
      message: `Eleição deve ser um destes anos: ${ELECTION_YEARS.join(', ')}`,
    })
    .optional()
    .describe('Ano da eleição: restringe ao período oficial de campanha'),
  cursor: z.string().optional().describe('Cursor opaco devolvido em nextCursor'),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

const slugParamsSchema = z.object({ slug: z.string().min(1).max(200) })

const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(MIN_QUERY_LENGTH, `A busca precisa de pelo menos ${String(MIN_QUERY_LENGTH)} caracteres`)
    .max(MAX_QUERY_LENGTH)
    .describe('Texto recebido, em português; acentos e erros de digitação são tolerados'),
  limit: z.coerce.number().int().min(1).max(MAX_SEARCH_SIZE).default(DEFAULT_SEARCH_SIZE),
})

type ClaimsQuery = z.infer<typeof claimsQuerySchema>

export function encodeCursor(offset: number): string {
  return Buffer.from(`${CURSOR_PREFIX}${String(offset)}`).toString('base64url')
}

export function decodeCursor(cursor: string): number | null {
  const decoded = Buffer.from(cursor, 'base64url').toString('utf8')
  if (!decoded.startsWith(CURSOR_PREFIX)) return null
  const offset = Number(decoded.slice(CURSOR_PREFIX.length))
  return Number.isSafeInteger(offset) && offset >= 0 ? offset : null
}

function matches(claim: ClaimSummary, query: ClaimsQuery): boolean {
  const { verdict, checker, theme, election } = query
  if (verdict !== undefined && !claim.reviews.some((review) => review.verdict === verdict)) {
    return false
  }
  if (checker !== undefined && !claim.reviews.some((review) => review.checkerId === checker)) {
    return false
  }
  if (theme !== undefined && !claim.themes.includes(theme)) return false
  if (election !== undefined) {
    const period = findElection(election)
    if (period === undefined) return false
    return claim.reviews.some((review) => isInCampaign(review.reviewDate, period))
  }
  return true
}

export function registerClaimRoutes(app: ZodApp, { store }: RouteDeps): void {
  app.get(
    '/v1/claims',
    {
      schema: {
        summary: 'Feed de alegações checadas, mais recentes primeiro',
        description:
          'Cada item agrupa as checagens da mesma alegação, com o veredito de cada checador lado ' +
          'a lado. Os filtros selecionam grupos que tenham ao menos uma checagem compatível; o ' +
          'grupo vem sempre completo.',
        tags: ['alegações'],
        querystring: claimsQuerySchema,
      },
    },
    async (request, reply) => {
      const offset = request.query.cursor === undefined ? 0 : decodeCursor(request.query.cursor)
      if (offset === null) return sendError(reply, 400, 'Bad Request', 'Cursor inválido')
      const snapshot = await store.current()
      const filtered = snapshot.claims.filter((claim) => matches(claim, request.query))
      const end = offset + request.query.limit
      const page: Page<ClaimSummary> = {
        items: filtered.slice(offset, end),
        total: filtered.length,
        nextCursor: end < filtered.length ? encodeCursor(end) : null,
      }
      return page
    },
  )

  app.get(
    '/v1/claims/:slug',
    {
      schema: {
        summary: 'Uma alegação, com todas as checagens e alegações parecidas',
        tags: ['alegações'],
        params: slugParamsSchema,
      },
    },
    async (request, reply) => {
      const snapshot = await store.current()
      const claim = snapshot.claimsBySlug.get(request.params.slug)
      if (claim === undefined) {
        return sendError(reply, 404, 'Not Found', 'Alegação não encontrada')
      }
      const detail: ClaimDetail = { ...claim, related: findRelated(claim, snapshot.claims) }
      return detail
    },
  )

  app.get(
    '/v1/search',
    {
      schema: {
        summary: 'Busca por texto em português, por similaridade',
        tags: ['alegações'],
        querystring: searchQuerySchema,
      },
    },
    async (request) => {
      const snapshot = await store.current()
      const result: SearchResult = {
        query: request.query.q,
        items: snapshot.search.search(request.query.q, { limit: request.query.limit }),
      }
      return result
    },
  )
}
