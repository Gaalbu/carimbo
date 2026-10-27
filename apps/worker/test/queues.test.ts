import { describe, expect, it } from 'vitest'

import { describePipeline, POLL_INTERVAL_MS, QUEUE_NAMES } from '../src/queues.js'

describe('ingestion pipeline', () => {
  it('runs the stages in the order planned for F1', () => {
    expect(describePipeline()).toBe('poll-sources → extract → normalize → dedupe')
  })

  it('has one queue per stage', () => {
    expect(new Set(QUEUE_NAMES).size).toBe(QUEUE_NAMES.length)
  })

  it('polls the sources every 15 minutes', () => {
    expect(POLL_INTERVAL_MS).toBe(900_000)
  })
})
