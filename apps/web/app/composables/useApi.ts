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
  return useFetch<T>(() => toValue(path), {
    baseURL: config.public.apiBase,
    query: options.query,
    ...(options.key ? { key: options.key } : {}),
    lazy: options.lazy ?? false,
    server: options.server ?? true,
    timeout: 8000,
    retry: 0,
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
