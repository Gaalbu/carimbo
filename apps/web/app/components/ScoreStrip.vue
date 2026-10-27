<script setup lang="ts">
import type { StatsResponse } from '@carimbo/core'

import { formatNumber } from '~/utils/format'
import { VERDICT_ORDER } from '~/utils/verdict'

const SHORT_LABEL = {
  false: 'Falso',
  out_of_context: 'Contexto',
  true: 'Verdadeiro',
  unknown: 'Outros',
} as const

// Same request (and cache key) as the home scoreboard.
const { data } = useApi<StatsResponse>('/v1/stats/today', { query: { days: 1 }, lazy: true })
</script>

<template>
  <!-- Compact scoreboard pinned to the top on phones (docs/PLANO.md §2 #3). -->
  <aside v-if="data && data.indexed > 0" class="strip" aria-label="Placar de hoje">
    <span class="strip__lead">Hoje</span>
    <span
      v-for="verdict in VERDICT_ORDER"
      :key="verdict"
      class="strip__item"
      :data-verdict="verdict"
    >
      <span class="strip__dot" aria-hidden="true" />
      {{ SHORT_LABEL[verdict] }}
      <strong>{{ formatNumber(data.counts[verdict]) }}</strong>
    </span>
  </aside>
</template>

<style scoped>
.strip {
  position: sticky;
  top: 0;
  z-index: 15;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 12px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--line);
  background: var(--panel);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.strip__lead {
  color: var(--fg-3);
  font-size: var(--t-micro);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.strip__item {
  --c: var(--outro);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--fg-2);
}

.strip__item strong {
  color: var(--fg);
}

.strip__item[data-verdict='false'] {
  --c: var(--falso);
}

.strip__item[data-verdict='out_of_context'] {
  --c: var(--contexto);
}

.strip__item[data-verdict='true'] {
  --c: var(--verdadeiro);
}

.strip__dot {
  width: 8px;
  height: 8px;
  background: var(--c);
}

@media (min-width: 1024px) {
  .strip {
    display: none;
  }
}
</style>
