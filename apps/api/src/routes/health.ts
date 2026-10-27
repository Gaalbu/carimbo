import type { FastifyInstance } from 'fastify'

export interface HealthResponse {
  status: 'ok'
}

const healthResponseSchema = {
  type: 'object',
  required: ['status'],
  properties: { status: { type: 'string', const: 'ok' } },
  additionalProperties: false,
} as const

export function registerHealthRoute(app: FastifyInstance): void {
  app.get(
    '/health',
    { schema: { response: { 200: healthResponseSchema } } },
    (): HealthResponse => ({ status: 'ok' }),
  )
}
