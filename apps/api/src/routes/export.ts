import { exportJson, toCsv } from '@carimbo/core'

import type { RouteDeps, ZodApp } from './deps.js'

export { escapeCsv, toCsv } from '@carimbo/core'

export function registerExportRoutes(app: ZodApp, { store }: RouteDeps): void {
  app.get(
    '/v1/export.json',
    {
      schema: {
        summary: 'Todas as checagens indexadas, com proveniência completa (JSON)',
        tags: ['dados abertos'],
      },
    },
    async (_request, reply) => {
      const snapshot = await store.current()
      void reply.header('content-disposition', 'attachment; filename="carimbo-checagens.json"')
      return exportJson(snapshot)
    },
  )

  app.get(
    '/v1/export.csv',
    {
      schema: {
        summary: 'Todas as checagens indexadas, com proveniência completa (CSV, UTF-8)',
        tags: ['dados abertos'],
      },
    },
    async (_request, reply) => {
      const snapshot = await store.current()
      return reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header('content-disposition', 'attachment; filename="carimbo-checagens.csv"')
        .send(toCsv(snapshot.reviews))
    },
  )
}
