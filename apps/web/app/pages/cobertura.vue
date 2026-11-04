<script setup lang="ts">
import type { CoverageResponse } from '@carimbo/core'

import { formatInstant } from '~/utils/format'

const { data: coverage, error } = await useApi<CoverageResponse>('/v1/coverage')

usePageSeo({
  title: 'Cobertura do arquivo',
  description:
    'Quantas checagens o Carimbo indexou de cada checador em cada ano, com datas e método de coleta. O que falta aparece como sem cobertura.',
})
</script>

<template>
  <div class="page">
    <div class="prose">
      <h1 class="manchete">Cobertura do arquivo</h1>
      <p>
        Checagens indexadas pelo Carimbo por checador e por ano, com a primeira e a última data e o
        método de coleta. Onde não há registros, não sabemos se houve investigação.
      </p>
      <p>
        A situação da investigação e as falhas por fonte e ano ainda não estão disponíveis: não há
        relatório persistido com esses dados.
      </p>
      <p v-if="coverage">
        Última geração do arquivo de checagens:
        {{ formatInstant(coverage.updatedAt) ?? 'data indisponível' }}.
      </p>
      <p>
        Os números representam apenas o que já foi indexado. Mesmo onde há registros, a coleta
        histórica pode estar incompleta; as quantidades não indicam o total publicado pelos
        checadores.
      </p>
    </div>

    <StateMessage v-if="error" kind="error" title="A tabela de cobertura não carregou agora.">
      A API do Carimbo não respondeu. Tente de novo em alguns minutos.
    </StateMessage>
    <StateMessage
      v-else-if="!coverage || coverage.checkers.length === 0"
      title="Ainda não há checagens indexadas."
    />
    <CoverageTable v-else :coverage="coverage" />
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 24px;
  max-width: 1320px;
  margin: 0 auto;
  padding: 24px 16px 40px;
}
</style>
