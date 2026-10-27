import {
  ELECTIONS,
  FACT_CHECKERS,
  isInCampaign,
  type CoverageResponse,
  type CoverageRow,
  type Election,
  type Review,
  type StatsResponse,
} from '@carimbo/core'
import { z } from 'zod'

import { countVerdicts } from '../counts.js'
import { addDays, saoPauloDay } from '../dates.js'
import type { RouteDeps, ZodApp } from './deps.js'

const MAX_STATS_DAYS = 30
/** First election with fact-checking on record (docs/PLANO.md §4.5): coverage starts here. */
const FIRST_COVERAGE_YEAR = 2014

const statsQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_STATS_DAYS)
    .default(1)
    .describe('Tamanho da janela em dias, terminando hoje (horário de Brasília)'),
})

function inWindow(review: Review, from: string, to: string): boolean {
  return review.reviewDate !== null && review.reviewDate >= from && review.reviewDate <= to
}

function coverageRows(reviews: readonly Review[]): CoverageRow[] {
  const byKey = new Map<string, Review[]>()
  for (const review of reviews) {
    if (review.reviewDate === null) continue
    const key = `${review.checkerId}|${review.reviewDate.slice(0, 4)}`
    const list = byKey.get(key)
    if (list === undefined) byKey.set(key, [review])
    else list.push(review)
  }
  const order = new Map(FACT_CHECKERS.map((checker, index) => [checker.id, index]))
  return [...byKey.entries()]
    .map(([key, list]): CoverageRow => {
      const [checkerId = '', year = ''] = key.split('|')
      const dates = list.map((review) => review.reviewDate ?? '').sort()
      return {
        checkerId,
        year: Number(year),
        count: list.length,
        firstDate: dates[0] ?? null,
        lastDate: dates.at(-1) ?? null,
        methods: [...new Set(list.map((review) => review.provenance.method))].sort(),
      }
    })
    .sort(
      (a, b) =>
        (order.get(a.checkerId) ?? order.size) - (order.get(b.checkerId) ?? order.size) ||
        a.checkerId.localeCompare(b.checkerId) ||
        a.year - b.year,
    )
}

export function registerStatsRoutes(app: ZodApp, { store, now }: RouteDeps): void {
  app.get(
    '/v1/stats/today',
    {
      schema: {
        summary: 'Placar de checagens indexadas pelo Carimbo publicadas na janela',
        description:
          'Conta checagens indexadas pelo Carimbo pela data de publicação da checagem, numa ' +
          'janela que termina hoje no horário de Brasília. Checagens sem data não entram.',
        tags: ['números'],
        querystring: statsQuerySchema,
      },
    },
    async (request) => {
      const snapshot = await store.current()
      const to = saoPauloDay(now())
      const from = addDays(to, 1 - request.query.days)
      const windowed = snapshot.reviews.filter((review) => inWindow(review, from, to))
      const stats: StatsResponse = {
        from,
        to,
        counts: countVerdicts(windowed),
        total: windowed.length,
        indexed: snapshot.reviews.length,
        updatedAt: snapshot.generatedAt,
      }
      return stats
    },
  )

  app.get(
    '/v1/elections',
    {
      schema: {
        summary: 'Eleições com o período oficial de campanha e o placar de cada uma',
        tags: ['números'],
      },
    },
    async () => {
      const snapshot = await store.current()
      return [...ELECTIONS].reverse().map((election): Election => {
        const reviews = snapshot.reviews.filter((review) =>
          isInCampaign(review.reviewDate, election),
        )
        return {
          year: election.year,
          campaignStart: election.campaignStart,
          campaignEnd: election.campaignEnd,
          counts: countVerdicts(reviews),
          total: reviews.length,
        }
      })
    },
  )

  app.get(
    '/v1/coverage',
    {
      schema: {
        summary: 'Cobertura por checador e ano',
        description:
          'Uma linha por checador × ano com checagens datadas. Par ausente é lacuna ("sem ' +
          'cobertura"), nunca zero.',
        tags: ['números'],
      },
    },
    async () => {
      const snapshot = await store.current()
      const rows = coverageRows(snapshot.reviews)
      const dataYears = rows.map((row) => row.year)
      const first = Math.min(FIRST_COVERAGE_YEAR, ...dataYears)
      const last = Math.max(Number(saoPauloDay(now()).slice(0, 4)), ...dataYears)
      const coverage: CoverageResponse = {
        years: Array.from({ length: last - first + 1 }, (_, index) => first + index),
        checkers: FACT_CHECKERS,
        rows,
      }
      return coverage
    },
  )
}
