import { fastify, type FastifyInstance, type FastifyServerOptions } from 'fastify'

import { registerHealthRoute } from './routes/health.js'

export function buildApp(options: FastifyServerOptions = {}): FastifyInstance {
  const app = fastify(options)
  registerHealthRoute(app)
  return app
}
