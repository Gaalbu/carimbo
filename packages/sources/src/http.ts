import { ALLOW_ALL, DISALLOW_ALL, parseRobots, type RobotsRules } from './robots.js'

export const CARIMBO_USER_AGENT = 'CarimboBot/0.1 (+https://github.com/Gaalbu/carimbo)'

export interface FetchedResource {
  /** URL that was asked for. */
  readonly url: string
  /** URL that answered, after redirects. */
  readonly finalUrl: string
  readonly status: number
  readonly contentType: string | null
  /** Raw bytes as received (after transfer decoding), the input of `rawSha256`. */
  readonly body: Uint8Array
  readonly text: string
  /** ISO instant the response arrived. */
  readonly fetchedAt: string
}

export class HttpError extends Error {
  override readonly name = 'HttpError'
  constructor(
    readonly url: string,
    readonly status: number,
  ) {
    super(`HTTP ${String(status)} em ${url}`)
  }
}

export class RobotsDisallowedError extends Error {
  override readonly name = 'RobotsDisallowedError'
  constructor(readonly url: string) {
    super(`robots.txt não permite ${url}`)
  }
}

export interface PoliteFetcherOptions {
  readonly userAgent?: string
  /** Minimum time between the start of two requests to the same host. */
  readonly minIntervalMs?: number
  readonly timeoutMs?: number
  /** Extra attempts after the first, for network errors, timeouts, 429 and 5xx. */
  readonly retries?: number
  /** First backoff; doubles on every retry. */
  readonly backoffMs?: number
  readonly maxRedirects?: number
  readonly fetch?: typeof fetch
  readonly sleep?: (ms: number) => Promise<void>
  readonly now?: () => number
}

const DEFAULTS = {
  minIntervalMs: 1_000,
  timeoutMs: 30_000,
  retries: 3,
  backoffMs: 2_000,
  maxRedirects: 5,
} as const
const MAX_RETRY_AFTER_MS = 60_000
const MS_PER_SECOND = 1_000
const TOO_MANY_REQUESTS = 429
const FIRST_SERVER_ERROR = 500
const REDIRECT_STATUSES: ReadonlySet<number> = new Set([301, 302, 303, 307, 308])

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

/**
 * HTTP client for the checkers' sites: identifies itself, honours robots.txt, sends at most one
 * request per `minIntervalMs` to each host, times out and retries with exponential backoff.
 * Redirects are followed by hand so every hop goes through the same checks.
 */
export class PoliteFetcher {
  readonly userAgent: string
  private readonly minIntervalMs: number
  private readonly timeoutMs: number
  private readonly retries: number
  private readonly backoffMs: number
  private readonly maxRedirects: number
  private readonly fetchImpl: typeof fetch
  private readonly sleep: (ms: number) => Promise<void>
  private readonly now: () => number
  private readonly hostLocks = new Map<string, Promise<void>>()
  private readonly nextSlot = new Map<string, number>()
  private readonly robots = new Map<string, Promise<RobotsRules>>()

  constructor(options: PoliteFetcherOptions = {}) {
    this.userAgent = options.userAgent ?? CARIMBO_USER_AGENT
    this.minIntervalMs = options.minIntervalMs ?? DEFAULTS.minIntervalMs
    this.timeoutMs = options.timeoutMs ?? DEFAULTS.timeoutMs
    this.retries = options.retries ?? DEFAULTS.retries
    this.backoffMs = options.backoffMs ?? DEFAULTS.backoffMs
    this.maxRedirects = options.maxRedirects ?? DEFAULTS.maxRedirects
    this.fetchImpl = options.fetch ?? fetch
    this.sleep = options.sleep ?? defaultSleep
    this.now = options.now ?? Date.now
  }

  /** Fetches a page. Throws `RobotsDisallowedError`, `HttpError` or the last network error. */
  async get(url: string): Promise<FetchedResource> {
    let current = url
    for (let hop = 0; hop <= this.maxRedirects; hop++) {
      if (!(await this.isAllowed(current))) throw new RobotsDisallowedError(current)
      const response = await this.requestWithRetries(current)
      const location = response.headers.get('location')
      if (REDIRECT_STATUSES.has(response.status) && location !== null) {
        await response.body?.cancel()
        current = new URL(location, current).href
        continue
      }
      if (!response.ok) {
        await response.body?.cancel()
        throw new HttpError(current, response.status)
      }
      return await this.toResource(url, current, response)
    }
    throw new Error(`redirecionamentos demais a partir de ${url}`)
  }

  /** Whether robots.txt of the URL's origin lets this user agent fetch it. */
  async isAllowed(url: string): Promise<boolean> {
    const origin = new URL(url).origin
    let rules = this.robots.get(origin)
    if (rules === undefined) {
      rules = this.loadRobots(origin)
      this.robots.set(origin, rules)
    }
    return (await rules).isAllowed(url)
  }

  private async loadRobots(origin: string): Promise<RobotsRules> {
    let current = `${origin}/robots.txt`
    try {
      for (let hop = 0; hop <= this.maxRedirects; hop++) {
        const response = await this.requestWithRetries(current)
        const location = response.headers.get('location')
        if (REDIRECT_STATUSES.has(response.status) && location !== null) {
          await response.body?.cancel()
          current = new URL(location, current).href
          continue
        }
        if (response.ok) return parseRobots(await response.text(), this.userAgent)
        await response.body?.cancel()
        // RFC 9309: an unavailable robots.txt (4xx) allows everything; an unreachable one (5xx)
        // means the site may be in trouble, so nothing is fetched.
        return response.status < FIRST_SERVER_ERROR ? ALLOW_ALL : DISALLOW_ALL
      }
      return ALLOW_ALL
    } catch {
      return DISALLOW_ALL
    }
  }

  private async requestWithRetries(url: string): Promise<Response> {
    let lastError: unknown = null
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      if (attempt > 0) await this.sleep(this.backoffMs * 2 ** (attempt - 1))
      try {
        const response = await this.request(url)
        const retryable =
          response.status === TOO_MANY_REQUESTS || response.status >= FIRST_SERVER_ERROR
        if (!retryable || attempt === this.retries) return response
        await response.body?.cancel()
        const retryAfter = retryAfterMs(response.headers.get('retry-after'))
        if (retryAfter > 0) await this.sleep(retryAfter)
      } catch (error) {
        lastError = error
      }
    }
    throw lastError instanceof Error ? lastError : new Error(`falha ao buscar ${url}`)
  }

  /** One request, holding the host's slot so requests to a host never overlap or bunch up. */
  private async request(url: string): Promise<Response> {
    const host = new URL(url).host
    const previous = this.hostLocks.get(host) ?? Promise.resolve()
    let release = (): void => undefined
    const lock = new Promise<void>((resolve) => {
      release = resolve
    })
    this.hostLocks.set(
      host,
      previous.then(() => lock),
    )
    await previous
    try {
      const wait = (this.nextSlot.get(host) ?? 0) - this.now()
      if (wait > 0) await this.sleep(wait)
      this.nextSlot.set(host, this.now() + this.minIntervalMs)
      return await this.fetchImpl(url, {
        headers: { 'user-agent': this.userAgent, accept: '*/*' },
        redirect: 'manual',
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    } finally {
      release()
    }
  }

  private async toResource(
    url: string,
    finalUrl: string,
    response: Response,
  ): Promise<FetchedResource> {
    const body = new Uint8Array(await response.arrayBuffer())
    const contentType = response.headers.get('content-type')
    return {
      url,
      finalUrl,
      status: response.status,
      contentType,
      body,
      text: decode(body, contentType),
      fetchedAt: new Date(this.now()).toISOString(),
    }
  }
}

function retryAfterMs(header: string | null): number {
  const seconds = Number(header)
  if (header === null || !Number.isFinite(seconds) || seconds <= 0) return 0
  return Math.min(seconds * MS_PER_SECOND, MAX_RETRY_AFTER_MS)
}

function decode(body: Uint8Array, contentType: string | null): string {
  const charset = /charset=["']?([\w-]+)/i.exec(contentType ?? '')?.[1] ?? 'utf-8'
  try {
    return new TextDecoder(charset).decode(body)
  } catch {
    return new TextDecoder('utf-8').decode(body)
  }
}
