import { checkersWithCounts, themesWithCounts } from '@carimbo/core'

import type { RouteDeps, ZodApp } from './deps.js'

export function registerCatalogRoutes(app: ZodApp, { store }: RouteDeps): void {
  app.get(
    '/v1/checkers',
    {
      schema: {
        summary: 'Checadores cobertos, com o número de checagens indexadas de cada um',
        tags: ['catálogo'],
      },
    },
    async () => checkersWithCounts(await store.current()),
  )

  app.get(
    '/v1/themes',
    {
      schema: {
        summary: 'Temas (filtro de assunto), com o número de checagens de cada um',
        tags: ['catálogo'],
      },
    },
    async () => themesWithCounts(await store.current()),
  )
}
