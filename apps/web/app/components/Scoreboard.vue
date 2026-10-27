<script setup lang="ts">
import type { VerdictCounts } from '@carimbo/core'

import { formatNumber } from '~/utils/format'
import { VERDICT_LABEL, VERDICT_ORDER, countsSentence } from '~/utils/verdict'

const props = withDefaults(
  defineProps<{
    /** Lead of the headline: "Hoje", "Últimos 7 dias", "Eleição de 2022". */
    lead: string
    counts: VerdictCounts
    total: number
    headingLevel?: 'h1' | 'h2'
  }>(),
  { headingLevel: 'h2' },
)

const headline = computed(() =>
  props.total > 0
    ? `${props.lead}: ${countsSentence(props.counts)}`
    : `${props.lead}: nenhuma checagem indexada`,
)

const segments = computed(() =>
  VERDICT_ORDER.filter((verdict) => props.counts[verdict] > 0).map((verdict) => ({
    verdict,
    width: (props.counts[verdict] / props.total) * 100,
  })),
)

const barLabel = computed(() =>
  VERDICT_ORDER.map(
    (verdict) =>
      `${VERDICT_LABEL[verdict]}: ${Math.round((props.counts[verdict] / props.total) * 100)}%`,
  ).join('; '),
)
</script>

<template>
  <section class="score" :aria-label="`Placar: ${lead}`">
    <component :is="headingLevel" class="score__headline manchete">{{ headline }}</component>

    <dl class="score__figures">
      <div
        v-for="verdict in VERDICT_ORDER"
        :key="verdict"
        class="score__figure"
        :data-verdict="verdict"
      >
        <dt>{{ VERDICT_LABEL[verdict] }}</dt>
        <dd>{{ formatNumber(counts[verdict]) }}</dd>
      </div>
    </dl>

    <div
      v-if="total > 0"
      class="score__bar"
      role="img"
      :aria-label="`Proporção dos carimbos. ${barLabel}`"
    >
      <span
        v-for="segment in segments"
        :key="segment.verdict"
        class="score__segment"
        :data-verdict="segment.verdict"
        :style="{ width: `${segment.width}%` }"
      />
    </div>

    <p class="score__note micro muted">
      {{ formatNumber(total) }} {{ total === 1 ? 'checagem indexada' : 'checagens indexadas' }} pelo
      Carimbo<slot name="note" />
    </p>
  </section>
</template>

<style scoped>
.score {
  display: grid;
  gap: 14px;
}

.score__headline {
  text-wrap: balance;
}

.score__figures {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
}

.score__figure {
  --c: var(--outro);
  min-width: 0;
  padding-top: 8px;
  border-top: 3px solid var(--c);
}

.score__figure[data-verdict='false'] {
  --c: var(--falso);
}

.score__figure[data-verdict='out_of_context'] {
  --c: var(--contexto);
}

.score__figure[data-verdict='true'] {
  --c: var(--verdadeiro);
}

.score__figure dt {
  color: var(--fg-3);
  font-size: var(--t-micro);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.score__figure dd {
  margin: 0;
  color: var(--c);
  font-size: clamp(26px, 7vw, var(--t-fig));
  font-weight: 600;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.score__bar {
  display: flex;
  height: 8px;
  overflow: hidden;
  background: var(--panel-2);
}

.score__segment {
  height: 100%;
  background: var(--outro);
}

.score__segment[data-verdict='false'] {
  background: var(--falso);
}

.score__segment[data-verdict='out_of_context'] {
  background: var(--contexto);
}

.score__segment[data-verdict='true'] {
  background: var(--verdadeiro);
}

.score__segment + .score__segment {
  border-left: 2px solid var(--bg);
}
</style>
