/** Ingestion pipeline stages, in the order a fact-check flows through them (docs/PLANO.md §6). */
export const QUEUE_NAMES = ['poll-sources', 'extract', 'normalize', 'dedupe'] as const

export type QueueName = (typeof QUEUE_NAMES)[number]

const POLL_INTERVAL_MINUTES = 15
const MS_PER_MINUTE = 60_000

export const POLL_INTERVAL_MS = POLL_INTERVAL_MINUTES * MS_PER_MINUTE

export function describePipeline(): string {
  return QUEUE_NAMES.join(' → ')
}
