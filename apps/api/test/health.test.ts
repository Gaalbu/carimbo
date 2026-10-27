import { afterAll, describe, expect, it } from 'vitest'

import { buildApp } from '../src/app.js'
import type { HealthResponse } from '../src/routes/health.js'

describe('GET /health', () => {
  const app = buildApp()

  afterAll(async () => {
    await app.close()
  })

  it('reports the service as ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toMatch(/^application\/json/)
    expect(response.json<HealthResponse>()).toEqual({ status: 'ok' })
  })

  it('answers 404 for routes that do not exist yet', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/claims' })

    expect(response.statusCode).toBe(404)
  })
})
