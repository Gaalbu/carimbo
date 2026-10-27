import { describe, expect, it } from 'vitest'

import {
  CARIMBO_USER_AGENT,
  HttpError,
  PoliteFetcher,
  RobotsDisallowedError,
} from '../src/index.js'

type Handler = (url: string) => Response | Promise<Response>

interface Harness {
  readonly fetcher: PoliteFetcher
  readonly calls: { url: string; at: number; userAgent: string | null }[]
  readonly sleeps: number[]
}

/** A fetcher on a fake clock: sleeping advances time, so rate limits are checked exactly. */
function harness(handler: Handler, options: { retries?: number } = {}): Harness {
  let clock = 0
  const calls: Harness['calls'] = []
  const sleeps: number[] = []
  const fakeFetch = async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = input instanceof Request ? input.url : input.toString()
    const headers = new Headers(init?.headers)
    calls.push({ url, at: clock, userAgent: headers.get('user-agent') })
    return await handler(url)
  }
  const fetcher = new PoliteFetcher({
    fetch: fakeFetch,
    now: () => clock,
    sleep: (ms) => {
      sleeps.push(ms)
      clock += ms
      return Promise.resolve()
    },
    backoffMs: 100,
    retries: options.retries ?? 2,
  })
  return { fetcher, calls, sleeps }
}

const ROBOTS_OK = (): Response => new Response('User-agent: *\nDisallow: /privado\n')

describe('PoliteFetcher', () => {
  it('identifies itself and checks robots.txt once per origin', async () => {
    const { fetcher, calls } = harness((url) =>
      url.endsWith('/robots.txt') ? ROBOTS_OK() : new Response('<html>ok</html>'),
    )

    const page = await fetcher.get('https://example.org/a')
    await fetcher.get('https://example.org/b')

    expect(page.text).toBe('<html>ok</html>')
    expect(page.body).toBeInstanceOf(Uint8Array)
    expect(calls.map((call) => call.url)).toEqual([
      'https://example.org/robots.txt',
      'https://example.org/a',
      'https://example.org/b',
    ])
    expect(calls.every((call) => call.userAgent === CARIMBO_USER_AGENT)).toBe(true)
  })

  it('refuses paths robots.txt disallows, without requesting them', async () => {
    const { fetcher, calls } = harness((url) =>
      url.endsWith('/robots.txt') ? ROBOTS_OK() : new Response('x'),
    )

    await expect(fetcher.get('https://example.org/privado/x')).rejects.toBeInstanceOf(
      RobotsDisallowedError,
    )
    expect(calls).toHaveLength(1)
  })

  it('treats a missing robots.txt as allow-all and an erroring one as disallow-all', async () => {
    const missing = harness((url) =>
      url.endsWith('/robots.txt') ? new Response('', { status: 404 }) : new Response('ok'),
    )
    await expect(missing.fetcher.get('https://example.org/a')).resolves.toMatchObject({
      status: 200,
    })

    const broken = harness(
      (url) =>
        url.endsWith('/robots.txt') ? new Response('', { status: 503 }) : new Response('ok'),
      { retries: 0 },
    )
    await expect(broken.fetcher.get('https://example.org/a')).rejects.toBeInstanceOf(
      RobotsDisallowedError,
    )
  })

  it('keeps at least one second between requests to the same host', async () => {
    const { fetcher, calls } = harness((url) =>
      url.endsWith('/robots.txt') ? ROBOTS_OK() : new Response('ok'),
    )

    await Promise.all([
      fetcher.get('https://example.org/a'),
      fetcher.get('https://example.org/b'),
      fetcher.get('https://other.org/c'),
    ])

    const times = (host: string): number[] =>
      calls.filter((call) => call.url.includes(host)).map((call) => call.at)
    const gaps = (list: number[]): number[] =>
      list.slice(1).map((at, index) => at - (list[index] ?? 0))
    expect(gaps(times('example.org')).every((gap) => gap >= 1_000)).toBe(true)
    expect(times('example.org')).toHaveLength(3)
    expect(times('other.org')).toHaveLength(2)
  })

  it('retries 5xx and network errors with growing backoff', async () => {
    let attempts = 0
    const { fetcher, sleeps } = harness((url) => {
      if (url.endsWith('/robots.txt')) return ROBOTS_OK()
      attempts++
      if (attempts === 1) return new Response('', { status: 502 })
      if (attempts === 2) throw new TypeError('fetch failed')
      return new Response('ok')
    })

    const page = await fetcher.get('https://example.org/a')

    expect(page.text).toBe('ok')
    expect(attempts).toBe(3)
    expect(sleeps.filter((ms) => ms === 100 || ms === 200)).toEqual([100, 200])
  })

  it('does not retry a 404 and reports it as HttpError', async () => {
    let attempts = 0
    const { fetcher } = harness((url) => {
      if (url.endsWith('/robots.txt')) return ROBOTS_OK()
      attempts++
      return new Response('', { status: 404 })
    })

    await expect(fetcher.get('https://example.org/a')).rejects.toMatchObject({
      name: 'HttpError',
      status: 404,
    })
    expect(attempts).toBe(1)
    expect(HttpError).toBeDefined()
  })

  it('follows redirects through robots.txt of the new origin', async () => {
    const { fetcher, calls } = harness((url) => {
      if (url.endsWith('/robots.txt')) return ROBOTS_OK()
      if (url === 'https://example.org/a') {
        return new Response(null, {
          status: 301,
          headers: { location: 'https://www.example.org/a' },
        })
      }
      return new Response('final')
    })

    const page = await fetcher.get('https://example.org/a')

    expect(page.finalUrl).toBe('https://www.example.org/a')
    expect(page.url).toBe('https://example.org/a')
    expect(calls.map((call) => call.url)).toContain('https://www.example.org/robots.txt')
  })

  it('decodes the charset the server declares', async () => {
    const { fetcher } = harness((url) =>
      url.endsWith('/robots.txt')
        ? ROBOTS_OK()
        : new Response(new Uint8Array([0x63, 0xe7, 0x61]), {
            headers: { 'content-type': 'text/html; charset=iso-8859-1' },
          }),
    )

    expect((await fetcher.get('https://example.org/a')).text).toBe('cça')
  })
})
