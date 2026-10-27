import { z } from 'zod'

import type { ZodApp } from './deps.js'

export interface HealthResponse {
  status: 'ok'
}

const healthResponseSchema = z.object({ status: z.literal('ok') })

export function registerHealthRoute(app: ZodApp): void {
  app.get(
    '/health',
    { schema: { tags: ['serviço'], response: { 200: healthResponseSchema } } },
    (): HealthResponse => ({ status: 'ok' }),
  )
}
