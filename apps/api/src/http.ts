import type { FastifyReply } from 'fastify'

/** Public data, refreshed by the worker every few minutes: let CDNs and browsers cache it. */
export const PUBLIC_CACHE = 'public, max-age=60, stale-while-revalidate=300'

export interface ErrorBody {
  readonly statusCode: number
  readonly error: string
  readonly message: string
}

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  error: string,
  message: string,
): FastifyReply {
  const body: ErrorBody = { statusCode, error, message }
  return reply.code(statusCode).header('cache-control', 'no-store').send(body)
}
