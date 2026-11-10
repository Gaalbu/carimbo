import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createApiApp } from '../src/server.js'
import { EMPTY_SNAPSHOT } from '@carimbo/core'
import { staticStore } from '../src/store.js'

describe('NestJS HTTP application', () => {
  let app: NestFastifyApplication
  beforeAll(async () => {
    app = await createApiApp(staticStore(EMPTY_SNAPSHOT))
    await app.init()
  })
  afterAll(async () => {
    await app.close()
  })

  it('serves health and catalog from the Nest controllers', async () => {
    const server = app.getHttpAdapter().getInstance()
    expect((await server.inject('/health')).json()).toEqual({ status: 'ok' })
    const catalog = await server.inject('/v1/checkers')
    expect(catalog.statusCode).toBe(200)
    expect(catalog.headers['cache-control']).toBe('public, max-age=60, stale-while-revalidate=300')
    expect(catalog.json()).toHaveLength(7)
  })

  it('keeps cache, error and export contracts across Nest endpoints', async () => {
    const server = app.getHttpAdapter().getInstance()
    for (const path of [
      '/v1/themes',
      '/v1/claims',
      '/v1/search?q=urna',
      '/v1/stats/today',
      '/v1/elections',
      '/v1/coverage',
      '/v1/export.json',
      '/v1/export.csv',
    ]) {
      const response = await server.inject(path)
      expect(response.statusCode, path).toBe(200)
      expect(response.headers['cache-control'], path).toBe(
        'public, max-age=60, stale-while-revalidate=300',
      )
    }
    expect((await server.inject('/v1/export.csv')).headers['content-type']).toContain('text/csv')
    const bad = await server.inject('/v1/claims?limit=101')
    expect(bad.statusCode).toBe(400)
    expect(bad.headers['cache-control']).toBe('no-store')
    expect(bad.json()).toMatchObject({ statusCode: 400, error: 'Bad Request' })
    const missing = await server.inject('/v1/claims/no-such-claim')
    expect(missing.statusCode).toBe(404)
    expect(missing.json()).toMatchObject({ statusCode: 404, error: 'Not Found' })
  })

  it('publishes the OpenAPI document through Nest Swagger', async () => {
    const response = await app.getHttpAdapter().getInstance().inject('/docs/json')
    expect(response.statusCode).toBe(200)
    const document = response.json<{ openapi: string; paths: Record<string, unknown> }>()
    expect(document.openapi).toBeDefined()
    expect(document.paths).toHaveProperty('/v1/claims')
  })
})
