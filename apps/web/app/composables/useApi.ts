import { buildSnapshot, type ReviewStore, type StoreSnapshot } from '@carimbo/core'

import { withAppBase } from '~/utils/base-url'
import { resolveStaticApi, StaticApiError, type StaticQuery } from '~/utils/static-api'

type QueryValue = string | number | undefined

export interface ApiOptions {
  query?: MaybeRefOrGetter<Record<string, QueryValue>>
  key?: string
  lazy?: boolean
  server?: boolean
}

/**
 * Typed GET against the Carimbo API (`runtimeConfig.public.apiBase`). Errors are surfaced through
 * `error`, never replaced by made-up data.
 */
export function useApi<T>(path: MaybeRefOrGetter<string>, options: ApiOptions = {}) {
  const config = useRuntimeConfig()
  const markFailed = useMarkApiFailure()
  const staticFetch = useStaticFetch()
  return useFetch<T>(() => toValue(path), {
    ...(staticFetch ? { $fetch: staticFetch as typeof $fetch } : {}),
    onRequestError: markFailed,
    onResponseError: markFailed,
    baseURL: config.public.apiBase,
    query: options.query,
    ...(options.key ? { key: options.key } : {}),
    lazy: options.lazy ?? false,
    server: options.server ?? true,
    timeout: 8000,
    retry: 0,
    // Several components share keys (checkers, today's stats): reuse the request in flight.
    dedupe: 'defer',
  })
}

/** Imperative variant for client-side actions such as "carregar mais". */
export function apiFetch<T>(path: string, query: Record<string, QueryValue> = {}): Promise<T> {
  const config = useRuntimeConfig()
  const staticFetch = useStaticFetch()
  if (staticFetch) return staticFetch(path, { query }) as Promise<T>
  return $fetch<T>(path, { baseURL: config.public.apiBase, query, timeout: 8000, retry: 0 })
}

/** Absolute URL of an API resource, for plain links such as the open-data downloads. */
export function apiUrl(path: string): string {
  const config = useRuntimeConfig()
  return `${config.public.apiBase.replace(/\/$/, '')}${path}`
}

/** Download links of the open data: the API exports, or the published files in static mode. */
export function useExportUrls(): { json: string; csv: string } {
  const config = useRuntimeConfig()
  const file = config.public.staticData
  if (!file) return { json: apiUrl('/v1/export.json'), csv: apiUrl('/v1/export.csv') }
  const json = withAppBase(config.app.baseURL, file)
  return { json, csv: json.replace(/\.json$/, '.csv') }
}

type StaticFetch = (path: string, options?: { query?: unknown }) => Promise<unknown>

// One snapshot per process (server) or page load (browser): the file only changes on deploy.
let staticSnapshot: Promise<StoreSnapshot> | null = null

async function readStaticStore(url: string, diskPath: string): Promise<ReviewStore> {
  if (import.meta.server && diskPath) {
    // Prerender (`nuxt generate`): read the file the build is about to publish.
    const { readFile } = await import('node:fs/promises')
    return JSON.parse(await readFile(diskPath, 'utf8')) as ReviewStore
  }
  return $fetch<ReviewStore>(url, { retry: 1, timeout: 30_000 })
}

/**
 * Static mode (`runtimeConfig.public.staticData` set, e.g. GitHub Pages): API calls are answered
 * from the published store file, loaded once and indexed with the same code as the API. Returns
 * null when the site talks to the API.
 */
export function useStaticFetch(): StaticFetch | null {
  const config = useRuntimeConfig()
  const file = config.public.staticData
  if (!file) return null
  const url = withAppBase(config.app.baseURL, file)
  const diskPath = import.meta.server ? withAppBase(config.staticDataDir, file) : ''
  return async (path, options) => {
    staticSnapshot ??= readStaticStore(url, diskPath)
      .then(buildSnapshot)
      .catch((error: unknown) => {
        staticSnapshot = null
        throw error
      })
    const snapshot = await staticSnapshot
    try {
      return resolveStaticApi(
        snapshot,
        path,
        toValue(options?.query ?? {}) as StaticQuery,
        new Date(),
      )
    } catch (error) {
      if (error instanceof StaticApiError) {
        throw createError({ statusCode: error.statusCode, statusMessage: error.message })
      }
      throw error
    }
  }
}

/**
 * During SSR, an API failure turns the page into a 503 so the SWR/ISR cache never stores (and
 * keeps serving) an error state. The page still renders its error message.
 */
export function useMarkApiFailure(): (context?: { error?: unknown }) => void {
  const event = import.meta.server ? useRequestEvent() : undefined
  return (context) => {
    // A request cancelled by a newer one with the same key is not an API failure.
    if (context?.error instanceof Error && context.error.name === 'AbortError') return
    if (event) setResponseStatus(event, 503)
  }
}
