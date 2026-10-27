import { coverage, electionsWithCounts, statsForWindow } from '@carimbo/core'
import { z } from 'zod'

import type { RouteDeps, ZodApp } from './deps.js'

const MAX_STATS_DAYS = 30

const statsQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_STATS_DAYS)
    .default(1)
    .describe('Tamanho da janela em dias, terminando hoje (horário de Brasília)'),
})

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
    async (request) => statsForWindow(await store.current(), now(), request.query.days),
  )

  app.get(
    '/v1/elections',
    {
      schema: {
        summary: 'Eleições com o período oficial de campanha e o placar de cada uma',
        tags: ['números'],
      },
    },
    async () => electionsWithCounts(await store.current()),
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
    async () => coverage(await store.current(), now()),
  )
}
