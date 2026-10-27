import { describe, expect, it } from 'vitest'

import { CARIMBO_USER_AGENT, parseRobots, productToken } from '../src/index.js'

describe('parseRobots', () => {
  it('uses the wildcard group when no group names the bot', () => {
    const rules = parseRobots(
      'User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nDisallow: /busca/\n',
      CARIMBO_USER_AGENT,
    )
    expect(rules.isAllowed('https://example.org/checagem/')).toBe(true)
    expect(rules.isAllowed('https://example.org/busca/x')).toBe(false)
  })

  it('prefers a group naming the bot over the wildcard', () => {
    const rules = parseRobots(
      'User-agent: *\nDisallow: /\n\nUser-agent: CarimboBot\nAllow: /\nDisallow: /privado',
      CARIMBO_USER_AGENT,
    )
    expect(rules.isAllowed('https://example.org/a')).toBe(true)
    expect(rules.isAllowed('https://example.org/privado/b')).toBe(false)
  })

  it('applies the longest match, Allow winning ties, with * and $', () => {
    const rules = parseRobots(
      [
        'User-agent: *',
        'Disallow: /estadao',
        'Allow: /estadao-verifica',
        'Disallow: /feed/$',
        'Disallow: /*.jhtm',
      ].join('\n'),
      CARIMBO_USER_AGENT,
    )
    expect(rules.isAllowed('https://example.org/estadao/x')).toBe(false)
    expect(rules.isAllowed('https://example.org/estadao-verifica/x')).toBe(true)
    expect(rules.isAllowed('https://example.org/feed/')).toBe(false)
    expect(rules.isAllowed('https://example.org/feed/rss')).toBe(true)
    expect(rules.isAllowed('https://example.org/a/b.jhtm')).toBe(false)
  })

  it('reads field names with soft hyphens and merges groups for the same agent', () => {
    const rules = parseRobots(
      'User­-agent: *\nDisallow: /feed/\n\nUser-agent: *\nDisallow: /wp-admin/',
      CARIMBO_USER_AGENT,
    )
    expect(rules.isAllowed('https://example.org/feed/')).toBe(false)
    expect(rules.isAllowed('https://example.org/wp-admin/')).toBe(false)
    expect(rules.isAllowed('https://example.org/publica%C3%A7%C3%B5es/x/')).toBe(true)
  })

  it('always allows robots.txt itself', () => {
    const rules = parseRobots('User-agent: *\nDisallow: /', CARIMBO_USER_AGENT)
    expect(rules.isAllowed('https://example.org/robots.txt')).toBe(true)
    expect(rules.isAllowed('https://example.org/')).toBe(false)
  })
})

describe('productToken', () => {
  it('takes the name before the version', () => {
    expect(productToken(CARIMBO_USER_AGENT)).toBe('carimbobot')
  })
})
