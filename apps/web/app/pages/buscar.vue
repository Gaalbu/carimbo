<script setup lang="ts">
import type { SearchResult } from '@carimbo/core'

import { truncate } from '~/utils/format'

// The API answers 400 below this length.
const MIN_QUERY = 3

const route = useRoute()
const q = computed(() => (typeof route.query.q === 'string' ? route.query.q.trim() : ''))

const { names } = await useCheckers()
const markFailed = useMarkApiFailure()

// Reactive key: a new query is a new request; an empty query never reaches the API.
const { data, error, status } = await useAsyncData(
  () => `search:${q.value}`,
  () =>
    q.value.length >= MIN_QUERY
      ? apiFetch<SearchResult>('/v1/search', { q: q.value }).catch((cause: unknown) => {
          markFailed({ error: cause })
          throw cause
        })
      : Promise.resolve(null),
)
const tooShort = computed(() => q.value.length > 0 && q.value.length < MIN_QUERY)

const items = computed(() => (q.value ? (data.value?.items ?? []) : []))

usePageSeo(() => ({
  title: q.value ? `Busca: ${truncate(q.value, 60)}` : 'Buscar uma checagem',
  description: 'Cole o que você recebeu e veja se alguma agência de checagem já checou.',
}))
</script>

<template>
  <div class="search-page">
    <h1 class="manchete">Isso já foi checado?</h1>
    <SearchBox :initial="q" :autofocus="!q" />

    <StateMessage v-if="tooShort" title="Digite pelo menos 3 letras para buscar." />
    <template v-else-if="q">
      <StateMessage v-if="error" kind="error" title="A busca não respondeu agora.">
        A API do Carimbo está fora do ar ou demorou demais. Tente de novo em alguns minutos.
      </StateMessage>
      <StateMessage v-else-if="status === 'pending'" title="Buscando…" />
      <section v-else-if="items.length" aria-labelledby="resultados">
        <h2 id="resultados" class="section-title" aria-live="polite">
          {{ items.length }}
          {{ items.length === 1 ? 'checagem parecida' : 'checagens parecidas' }} com “{{
            truncate(q, 80)
          }}”
        </h2>
        <ol class="results">
          <li v-for="item in items" :key="item.slug">
            <ClaimCard :claim="item" :checker-names="names" />
          </li>
        </ol>
      </section>
      <section v-else class="not-found" aria-labelledby="nao-checado">
        <h2 id="nao-checado" class="manchete" aria-live="polite">
          Ainda não checado. Envie para um checador
        </h2>
        <p class="muted">
          Nenhuma checagem indexada pelo Carimbo parece com “{{ truncate(q, 80) }}”. Isso não quer
          dizer que seja verdade nem mentira: só que ainda não encontramos uma checagem publicada.
          Mande para o canal oficial de uma agência:
        </p>
        <SubmitToChecker />
      </section>
    </template>
  </div>
</template>

<style scoped>
.search-page {
  display: grid;
  gap: 24px;
  max-width: 760px;
  margin: 0 auto;
  padding: 24px 16px 40px;
}

.results {
  margin: 0 -16px;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--line);
}

.not-found {
  display: grid;
  gap: 14px;
}
</style>
