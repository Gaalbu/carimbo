<script setup lang="ts">
import type { CoverageResponse } from '@carimbo/core'

import { isElectionYear } from '~/utils/elections'
import { formatDate } from '~/utils/format'

const route = useRoute()
const year = Number(route.params.ano)

if (!isElectionYear(year)) {
  throw createError({ statusCode: 404, statusMessage: 'Eleição fora do arquivo', fatal: true })
}

const { elections, error } = useElections()
const { data: coverage } = await useApi<CoverageResponse>('/v1/coverage')

const election = computed(() => elections.value.find((item) => item.year === year))

usePageSeo({
  title: `Eleição de ${year}`,
  description: `Checagens publicadas durante a campanha de ${year}, indexadas pelo Carimbo, com o carimbo e o link de cada checador.`,
})
</script>

<template>
  <ThreeColumn>
    <template #left>
      <SideThemes />
    </template>

    <header class="election-head">
      <p class="section-title">Recorte por eleição</p>
      <StateMessage
        v-if="error"
        kind="error"
        :title="`Os números da eleição de ${year} não carregaram agora.`"
      />
      <StateMessage
        v-else-if="!election"
        :title="`Ainda não há checagens indexadas da eleição de ${year}.`"
      >
        Quando houver checagens coletadas do período de campanha, elas aparecem aqui.
      </StateMessage>
      <template v-else>
        <Scoreboard
          :lead="`Eleição de ${year}`"
          :counts="election.counts"
          :total="election.total"
          heading-level="h1"
        >
          <template #note>
            entre {{ formatDate(election.campaignStart) }} e {{ formatDate(election.campaignEnd) }},
            período oficial de campanha (calendário do TSE). Os totais dependem de quem checou e de
            quanto foi coletado.
          </template>
        </Scoreboard>
      </template>
      <h1 v-if="error || !election" class="visually-hidden">Eleição de {{ year }}</h1>
    </header>

    <section v-if="coverage" aria-labelledby="cobertura-ano">
      <h2 id="cobertura-ano" class="section-title">Checadores em {{ year }}</h2>
      <CoverageTable :coverage="coverage" :years="[year]" />
      <p class="micro muted">
        “Sem cobertura” quer dizer que o Carimbo não tem dado daquele checador no ano, e não que ele
        não publicou nada. <NuxtLink to="/cobertura">Cobertura completa</NuxtLink>.
      </p>
    </section>

    <ClaimFeed :election="year" :title="`Checagens da campanha de ${year}`" />

    <template #right>
      <SideCheckers />
    </template>
  </ThreeColumn>
</template>

<style scoped>
.election-head {
  display: grid;
  gap: 12px;
}

.election-head .section-title {
  margin: 0;
}
</style>
