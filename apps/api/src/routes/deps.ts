import type {
  FastifyBaseLogger,
  FastifyInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import type { StoreSource } from '../store.js'

export interface RouteDeps {
  readonly store: StoreSource
  /** Clock, injectable so "today" is testable. */
  readonly now: () => Date
}

export type ZodApp = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  ZodTypeProvider
>
