import { describe, expect, it } from 'vitest'

import { archivedDate, dateOrMissing, formatDate } from '~/utils/format'
import { countsSentence, distinctVerdicts, verdictFromParam } from '~/utils/verdict'

describe('format', () => {
  it('formats ISO dates as text, without time-zone shifts', () => {
    expect(formatDate('2026-10-24')).toBe('24/10/2026')
    expect(formatDate('2026-10-24T23:59:00-03:00')).toBe('24/10/2026')
    expect(formatDate(null)).toBeNull()
    expect(dateOrMissing(null)).toBe('data não informada')
  })

  it('reads the snapshot date from a Wayback URL', () => {
    expect(archivedDate('https://web.archive.org/web/20141005000000/http://x.org')).toBe(
      '05/10/2014',
    )
    expect(archivedDate('https://example.org/x')).toBeNull()
  })
})

describe('verdict', () => {
  it('builds the headline with only non-zero counts', () => {
    expect(countsSentence({ false: 1, out_of_context: 0, true: 2, unknown: 0 })).toBe(
      '1 falso e 2 verdadeiros',
    )
  })

  it('keeps distinct verdicts in display order', () => {
    expect(distinctVerdicts(['true', 'false', 'true'])).toEqual(['false', 'true'])
  })

  it('maps Portuguese URL params back to verdicts', () => {
    expect(verdictFromParam('falso')).toBe('false')
    expect(verdictFromParam('contexto')).toBe('out_of_context')
    expect(verdictFromParam('nada')).toBeUndefined()
  })
})
