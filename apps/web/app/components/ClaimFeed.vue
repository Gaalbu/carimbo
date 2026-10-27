<script setup lang="ts">
import type { ClaimSummary, Page, Verdict } from '@carimbo/core'
import type { LocationQueryRaw } from 'vue-router'

import { formatNumber } from '~/utils/format'
import {
  VERDICT_LABEL,
  VERDICT_ORDER,
  VERDICT_PARAM,
  VERDICT_SHORTCUT,
  verdictFromParam,
} from '~/utils/verdict'

const PAGE_SIZE = 20

const props = withDefaults(
  defineProps<{
    /** Fixed slice of the feed (`election` or `theme`), on top of the user's filters. */
    election?: number
    theme?: string
    title?: string
  }>(),
  { election: undefined, theme: undefined, title: 'Checagens mais recentes' },
)

const route = useRoute()
const router = useRouter()
const checkersRequest = useCheckers()
const { checkers, names } = checkersRequest

const verdict = computed(() => verdictFromParam(route.query.carimbo))
const checker = computed(() =>
  typeof route.query.checador === 'string' && route.query.checador
    ? route.query.checador
    : undefined,
)
const startCursor = computed(() =>
  typeof route.query.cursor === 'string' ? route.query.cursor : undefined,
)

const apiQuery = computed(() => ({
  verdict: verdict.value,
  checker: checker.value,
  theme: props.theme,
  election: props.election,
  cursor: startCursor.value,
  limit: PAGE_SIZE,
}))

const { data, error, status } = await useApi<Page<ClaimSummary>>('/v1/claims', {
  query: apiQuery,
})
await checkersRequest

// Pages appended by "carregar mais"; reset whenever the filters change the first page.
const extra = ref<ClaimSummary[]>([])
const nextCursor = ref<string | null>(data.value?.nextCursor ?? null)
const loadingMore = ref(false)
const loadMoreError = ref(false)

watch(data, (page) => {
  extra.value = []
  nextCursor.value = page?.nextCursor ?? null
  loadMoreError.value = false
})

const items = computed(() => [...(data.value?.items ?? []), ...extra.value])
const filtered = computed(() => Boolean(verdict.value || checker.value))

function withQuery(patch: Record<string, string | undefined>): { query: LocationQueryRaw } {
  const merged: LocationQueryRaw = { ...route.query, cursor: undefined, ...patch }
  const query = Object.fromEntries(
    Object.entries(merged).filter(([, value]) => value !== undefined),
  )
  return { query }
}

function verdictLink(value: Verdict | undefined) {
  return withQuery({ carimbo: value ? VERDICT_PARAM[value] : undefined })
}

async function onCheckerChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  await router.push(withQuery({ checador: value || undefined }))
}

async function loadMore() {
  if (!nextCursor.value || loadingMore.value) return
  loadingMore.value = true
  loadMoreError.value = false
  try {
    const page = await apiFetch<Page<ClaimSummary>>('/v1/claims', {
      ...apiQuery.value,
      cursor: nextCursor.value,
    })
    extra.value = [...extra.value, ...page.items]
    nextCursor.value = page.nextCursor
  } catch {
    loadMoreError.value = true
  } finally {
    loadingMore.value = false
  }
}

const list = ref<HTMLElement | null>(null)

function moveFocus(step: 1 | -1) {
  const links = Array.from(list.value?.querySelectorAll<HTMLElement>('.card__link') ?? [])
  if (links.length === 0) return
  const current = links.findIndex((link) =>
    link.closest('[data-feed-item]')?.contains(document.activeElement),
  )
  const next = current === -1 ? (step === 1 ? 0 : links.length - 1) : current + step
  const target = links[Math.max(0, Math.min(links.length - 1, next))]
  target?.focus()
  target?.closest('[data-feed-item]')?.scrollIntoView({ block: 'nearest' })
}

useShortcuts((key, event) => {
  const shortcut = VERDICT_SHORTCUT[key]
  if (shortcut) {
    event.preventDefault()
    void router.push(verdictLink(verdict.value === shortcut ? undefined : shortcut))
  } else if (key === 'j') {
    event.preventDefault()
    moveFocus(1)
  } else if (key === 'k') {
    event.preventDefault()
    moveFocus(-1)
  }
})
</script>

<template>
  <section class="feed" aria-labelledby="feed-title">
    <div class="feed__head">
      <h2 id="feed-title" class="section-title">{{ title }}</h2>
      <p v-if="data" class="micro muted" aria-live="polite">
        {{ formatNumber(data.total) }}
        {{ data.total === 1 ? 'alegação' : 'alegações'
        }}<template v-if="filtered"> com esses filtros</template>
      </p>
    </div>

    <nav class="feed__filters" aria-label="Filtrar por carimbo">
      <ul class="chips">
        <li>
          <NuxtLink
            :to="verdictLink(undefined)"
            class="chip"
            :aria-current="!verdict ? 'true' : undefined"
          >
            Todos
          </NuxtLink>
        </li>
        <li v-for="value in VERDICT_ORDER" :key="value">
          <NuxtLink
            :to="verdictLink(value)"
            class="chip"
            :data-verdict="value"
            :aria-current="verdict === value ? 'true' : undefined"
          >
            {{ VERDICT_LABEL[value] }}
          </NuxtLink>
        </li>
      </ul>
      <form v-if="checkers.length" class="feed__checker" method="get" :action="route.path">
        <input v-if="verdict" type="hidden" name="carimbo" :value="VERDICT_PARAM[verdict]" />
        <label for="feed-checador" class="micro muted">Checador</label>
        <select id="feed-checador" name="checador" :value="checker ?? ''" @change="onCheckerChange">
          <option value="">Todos os checadores</option>
          <option v-for="item in checkers" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
        <noscript><button class="button" type="submit">Filtrar</button></noscript>
      </form>
    </nav>
    <p class="feed__keys micro muted">
      Atalhos: <kbd>F</kbd> falso, <kbd>C</kbd> fora de contexto, <kbd>V</kbd> verdadeiro,
      <kbd>J</kbd>/<kbd>K</kbd> próxima/anterior.
    </p>

    <StateMessage v-if="error" kind="error" title="Não foi possível carregar as checagens agora.">
      A API do Carimbo não respondeu. Tente de novo em alguns minutos.
    </StateMessage>
    <StateMessage v-else-if="status === 'pending' && !data" title="Carregando checagens…" />
    <StateMessage
      v-else-if="items.length === 0 && filtered"
      title="Nenhuma checagem com esses filtros."
    >
      <NuxtLink :to="withQuery({ carimbo: undefined, checador: undefined })"
        >Limpar filtros</NuxtLink
      >
    </StateMessage>
    <StateMessage v-else-if="items.length === 0" title="Ainda não há checagens indexadas aqui.">
      Quando os checadores publicarem e o Carimbo coletar, elas aparecem nesta lista.
    </StateMessage>

    <ol v-else ref="list" class="feed__list">
      <li v-for="claim in items" :key="claim.slug">
        <ClaimCard :claim="claim" :checker-names="names" />
      </li>
    </ol>

    <div v-if="nextCursor && !error" class="feed__more">
      <NuxtLink
        class="button"
        :to="withQuery({ cursor: nextCursor })"
        :aria-disabled="loadingMore ? 'true' : undefined"
        @click.prevent="loadMore"
      >
        {{ loadingMore ? 'Carregando…' : 'Carregar mais' }}
      </NuxtLink>
      <p v-if="loadMoreError" class="micro" role="alert">
        Não deu para carregar mais agora. Tente de novo.
      </p>
    </div>
  </section>
</template>

<style scoped>
.feed {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.feed__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.feed__head .section-title {
  margin: 0;
}

.feed__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chip {
  --c: var(--fg-2);
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid var(--line-2);
  color: var(--c);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

.chip[data-verdict='false'] {
  --c: var(--falso);
}

.chip[data-verdict='out_of_context'] {
  --c: var(--contexto);
}

.chip[data-verdict='true'] {
  --c: var(--verdadeiro);
}

.chip[data-verdict='unknown'] {
  --c: var(--fg-3);
}

.chip[aria-current='true'] {
  border-color: var(--c);
  background: var(--c);
  color: var(--bg);
}

.feed__checker {
  display: flex;
  align-items: center;
  gap: 8px;
}

.feed__checker select {
  min-height: 36px;
  max-width: 100%;
  padding: 0 8px;
  border: 1px solid var(--line-2);
  background: var(--panel);
}

.feed__keys {
  display: none;
}

.feed__keys kbd {
  padding: 0 4px;
  border: 1px solid var(--line-2);
  font-family: var(--sans);
}

@media (hover: hover) and (pointer: fine) {
  .feed__keys {
    display: block;
  }
}

.feed__list {
  margin: 0 -16px;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--line);
}

.feed__more {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 8px 0;
}
</style>
