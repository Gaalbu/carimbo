<script setup lang="ts">
import type { StatsResponse } from '@carimbo/core'

import { formatInstant } from '~/utils/format'

usePageSeo({
  title: 'Carimbo',
  description:
    'O que circulou, carimbado: falso, fora de contexto ou verdadeiro, numa tela só, com o link de quem checou.',
})

const { data: today, error: statsError } = await useApi<StatsResponse>('/v1/stats/today', {
  query: { days: 1 },
})

// An empty day falls back to the last 7 days, and the headline says so.
const needsWeek = computed(
  () => !!today.value && today.value.total === 0 && today.value.indexed > 0,
)
const week = needsWeek.value
  ? (await useApi<StatsResponse>('/v1/stats/today', { query: { days: 7 } })).data
  : ref<StatsResponse | undefined>(undefined)

const board = computed(() => {
  if (!today.value) return null
  if (needsWeek.value && week.value && week.value.total > 0) {
    return { stats: week.value, lead: 'Últimos 7 dias', fallback: true }
  }
  return { stats: today.value, lead: 'Hoje', fallback: needsWeek.value }
})

const updatedAt = computed(() => formatInstant(today.value?.updatedAt))
</script>

<template>
  <ThreeColumn>
    <template #left>
      <SideThemes />
    </template>

    <h1 class="visually-hidden">Carimbo: checagens de hoje</h1>

    <StateMessage
      v-if="statsError"
      kind="error"
      title="O placar não carregou: a API do Carimbo não respondeu."
    >
      As checagens voltam a aparecer assim que a API estiver no ar.
    </StateMessage>
    <StateMessage
      v-else-if="today && today.indexed === 0"
      title="Ainda não há checagens indexadas."
    >
      O Carimbo junta checagens já publicadas por agências brasileiras. Assim que a primeira coleta
      terminar, o placar e o feed aparecem aqui.
    </StateMessage>
    <Scoreboard
      v-else-if="board"
      :lead="board.lead"
      :counts="board.stats.counts"
      :total="board.stats.total"
    >
      <template #note>
        <template v-if="board.fallback && board.lead === 'Hoje'">
          . Nenhuma checagem publicada hoje até agora e nenhuma nos últimos 7 dias</template
        >
        <template v-else-if="board.fallback">
          . Nenhuma checagem publicada hoje até agora, por isso o placar mostra os últimos 7
          dias</template
        >
        <template v-if="updatedAt">. Última coleta em {{ updatedAt }}</template
        >.
      </template>
    </Scoreboard>

    <SearchBox />

    <ClaimFeed />

    <template #right>
      <SideCheckers />
    </template>
  </ThreeColumn>
</template>
