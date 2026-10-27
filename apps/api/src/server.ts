import { buildApp } from './app.js'

const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 3001

const app = buildApp({ logger: true })
const host = process.env.API_HOST ?? DEFAULT_HOST
const port = Number(process.env.API_PORT ?? DEFAULT_PORT)

try {
  await app.listen({ host, port })
} catch (error) {
  app.log.error(error)
  process.exitCode = 1
}
