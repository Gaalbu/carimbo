import { afterAll, describe, expect, it } from 'vitest'

import { buildApp } from '../src/app.js'
import type { HealthResponse } from '../src/routes/health.js'

describe('GET /health', () => {
  const app = buildApp({ dataFile: '/nonexistent/reviews.json' })

  afterAll(async () => {
    await app.close()
  })

  it('reports the service as ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toMatch(/^application\/json/)
    expect(response.json<HealthResponse>()).toEqual({ status: 'ok' })
  })

  it('answers a JSON 404 for unknown routes', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/nada' })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Rota não encontrada',
    })
  })
})
