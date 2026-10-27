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
  return useFetch<T>(() => toValue(path), {
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
  return $fetch<T>(path, { baseURL: config.public.apiBase, query, timeout: 8000, retry: 0 })
}

/** Absolute URL of an API resource, for plain links such as the open-data downloads. */
export function apiUrl(path: string): string {
  const config = useRuntimeConfig()
  return `${config.public.apiBase.replace(/\/$/, '')}${path}`
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
