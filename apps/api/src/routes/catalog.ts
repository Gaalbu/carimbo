import { FACT_CHECKERS, THEMES, type CheckerWithCount, type ThemeWithCount } from '@carimbo/core'

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
    async () => {
      const snapshot = await store.current()
      const counts = new Map<string, number>()
      for (const review of snapshot.reviews) {
        counts.set(review.checkerId, (counts.get(review.checkerId) ?? 0) + 1)
      }
      return FACT_CHECKERS.map((checker): CheckerWithCount => ({
        ...checker,
        count: counts.get(checker.id) ?? 0,
      }))
    },
  )

  app.get(
    '/v1/themes',
    {
      schema: {
        summary: 'Temas (filtro de assunto), com o número de checagens de cada um',
        tags: ['catálogo'],
      },
    },
    async () => {
      const snapshot = await store.current()
      return THEMES.map((theme): ThemeWithCount => ({
        slug: theme.slug,
        name: theme.name,
        count: snapshot.claims
          .filter((claim) => claim.themes.includes(theme.slug))
          .reduce((sum, claim) => sum + claim.reviews.length, 0),
      }))
    },
  )
}
