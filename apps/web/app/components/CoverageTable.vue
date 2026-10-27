<script setup lang="ts">
import type { CoverageResponse, CoverageRow } from '@carimbo/core'

import { formatDate, formatNumber } from '~/utils/format'

const props = withDefaults(
  defineProps<{
    coverage: CoverageResponse
    /** Restrict to these years (e.g. one election); defaults to every year in the response. */
    years?: readonly number[]
  }>(),
  { years: undefined },
)

const shownYears = computed(() => [...(props.years ?? props.coverage.years)].sort((a, b) => b - a))

const rowsByKey = computed(() => {
  const map = new Map<string, CoverageRow>()
  for (const row of props.coverage.rows) map.set(`${row.checkerId}:${row.year}`, row)
  return map
})

function cell(checkerId: string, year: number): CoverageRow | undefined {
  return rowsByKey.value.get(`${checkerId}:${year}`)
}

const METHOD_LABEL: Record<string, string> = {
  factcheck_api: 'API do Google',
  claimreview: 'ClaimReview',
  html_parser: 'página do checador',
  wayback: 'Wayback Machine',
}

function methods(row: CoverageRow): string {
  return row.methods.map((method) => METHOD_LABEL[method] ?? method).join(', ')
}

function span(row: CoverageRow): string {
  const first = formatDate(row.firstDate) ?? 'data não informada'
  const last = formatDate(row.lastDate) ?? 'data não informada'
  return first === last ? first : `${first} a ${last}`
}
</script>

<template>
  <div class="table-wrap">
    <table class="table coverage">
      <caption class="visually-hidden">
        Checagens indexadas pelo Carimbo por checador e ano. Pares sem dado aparecem como sem
        cobertura.
      </caption>
      <thead>
        <tr>
          <th scope="col">Checador</th>
          <th v-for="year in shownYears" :key="year" scope="col">{{ year }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="checker in coverage.checkers" :key="checker.id">
          <th scope="row">{{ checker.name }}</th>
          <td v-for="year in shownYears" :key="year">
            <template v-if="cell(checker.id, year)">
              <strong class="coverage__count">{{
                formatNumber(cell(checker.id, year)!.count)
              }}</strong>
              <span class="coverage__meta">{{ span(cell(checker.id, year)!) }}</span>
              <span class="coverage__meta">{{ methods(cell(checker.id, year)!) }}</span>
            </template>
            <span v-else class="coverage__gap">sem cobertura</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.coverage td {
  min-width: 120px;
}

.coverage tbody th {
  font-weight: 600;
  white-space: nowrap;
}

.coverage__count {
  display: block;
  font-size: 16px;
  font-variant-numeric: tabular-nums;
}

.coverage__meta {
  display: block;
  color: var(--fg-3);
  font-size: var(--t-micro);
}

.coverage__gap {
  color: var(--fg-3);
  font-style: italic;
}
</style>
