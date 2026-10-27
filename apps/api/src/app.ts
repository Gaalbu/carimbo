import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { fastify, type FastifyInstance, type FastifyServerOptions } from 'fastify'
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'

import { PUBLIC_CACHE, sendError } from './http.js'
import { registerCatalogRoutes } from './routes/catalog.js'
import { registerClaimRoutes } from './routes/claims.js'
import type { RouteDeps } from './routes/deps.js'
import { registerExportRoutes } from './routes/export.js'
import { registerHealthRoute } from './routes/health.js'
import { registerStatsRoutes } from './routes/stats.js'
import { DEFAULT_DATA_FILE, fileStore, type StoreSource } from './store.js'

export const DEFAULT_WEB_ORIGIN = 'http://localhost:3000'

export interface AppOptions {
  readonly logger?: FastifyServerOptions['logger']
  /** Path to the `ReviewStore` JSON; ignored when `store` is given. */
  readonly dataFile?: string
  readonly store?: StoreSource
  /** Origin allowed by CORS. */
  readonly webOrigin?: string
  readonly now?: () => Date
}

function validationMessage(error: {
  validation: readonly { message?: string; instancePath: string }[]
}): string {
  const details = error.validation.map((issue) => {
    const field = issue.instancePath.replace(/^\//, '')
    return field === '' ? (issue.message ?? '') : `${field}: ${issue.message ?? 'inválido'}`
  })
  return `Parâmetros inválidos. ${details.join('; ')}`
}

export function buildApp(options: AppOptions = {}): FastifyInstance {
  const app = fastify({ logger: options.logger ?? false })
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  const deps: RouteDeps = {
    store: options.store ?? fileStore(options.dataFile ?? DEFAULT_DATA_FILE, app.log),
    now: options.now ?? (() => new Date()),
  }

  void app.register(cors, {
    origin: options.webOrigin ?? DEFAULT_WEB_ORIGIN,
    methods: ['GET', 'HEAD'],
  })
  void app.register(swagger, {
    openapi: {
      info: {
        title: 'Carimbo API',
        description:
          'Checagens publicadas por agências brasileiras, agrupadas por alegação. O Carimbo não ' +
          'checa nada: todo veredito vem de um checador, com link. Totais são de checagens ' +
          'indexadas pelo Carimbo.',
        version: '0.0.0',
      },
    },
    transform: jsonSchemaTransform,
  })
  void app.register(swaggerUi, { routePrefix: '/docs' })

  app.addHook('onSend', async (request, reply) => {
    if (
      reply.statusCode === 200 &&
      request.url.startsWith('/v1/') &&
      !reply.hasHeader('cache-control')
    ) {
      void reply.header('cache-control', PUBLIC_CACHE)
    }
  })

  app.setNotFoundHandler((_request, reply) =>
    sendError(reply, 404, 'Not Found', 'Rota não encontrada'),
  )

  app.setErrorHandler((error, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return sendError(reply, 400, 'Bad Request', validationMessage(error))
    }
    const statusCode =
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof error.statusCode === 'number'
        ? error.statusCode
        : 500
    if (statusCode < 500) {
      const message = error instanceof Error ? error.message : 'Requisição inválida'
      return sendError(reply, statusCode, 'Bad Request', message)
    }
    request.log.error({ err: error }, 'request failed')
    return sendError(reply, 500, 'Internal Server Error', 'Erro interno')
  })

  // Routes go inside a plugin so they register after swagger and show up in the OpenAPI spec.
  void app.register((instance, _opts, done) => {
    const typed = instance.withTypeProvider<ZodTypeProvider>()
    registerHealthRoute(typed)
    registerClaimRoutes(typed, deps)
    registerStatsRoutes(typed, deps)
    registerCatalogRoutes(typed, deps)
    registerExportRoutes(typed, deps)
    done()
  })

  return app
}
