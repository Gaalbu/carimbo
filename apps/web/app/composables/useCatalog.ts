import type { CheckerWithCount, Election, ThemeWithCount } from '@carimbo/core'

/** Lists may arrive bare or wrapped in `{ items }`; both are accepted. */
function asList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items)) {
    return (value as { items: T[] }).items
  }
  return []
}

/** Usable both as `const x = useX()` and `const x = await useX()`, like `useFetch` itself. */
function awaitable<R extends PromiseLike<unknown> & AsyncFields, T extends object>(
  request: R,
  extra: T,
) {
  // Only plain fields: spreading the request would copy its `then` and make the result adopt it.
  const { data, error, status, refresh } = request
  const value = { data, error, status, refresh, ...extra }
  return Object.assign(
    Promise.resolve(request).then(() => value),
    value,
  )
}

interface AsyncFields {
  data: unknown
  error: unknown
  status: unknown
  refresh: unknown
}

export function useCheckers() {
  const request = useApi<CheckerWithCount[] | { items: CheckerWithCount[] }>('/v1/checkers', {
    key: 'checkers',
  })
  const checkers = computed(() => asList<CheckerWithCount>(request.data.value))
  const names = computed<Record<string, string>>(() =>
    Object.fromEntries(checkers.value.map((checker) => [checker.id, checker.name])),
  )
  return awaitable(request, { checkers, names })
}

export function useThemes() {
  const request = useApi<ThemeWithCount[] | { items: ThemeWithCount[] }>('/v1/themes', {
    key: 'themes',
  })
  const themes = computed(() => asList<ThemeWithCount>(request.data.value))
  return awaitable(request, { themes })
}

export function useElections() {
  const request = useApi<Election[] | { items: Election[] }>('/v1/elections', {
    key: 'elections',
  })
  const elections = computed(() => asList<Election>(request.data.value))
  return awaitable(request, { elections })
}
