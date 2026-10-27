<script setup lang="ts">
import { formatNumber } from '~/utils/format'

const { checkers, error } = useCheckers()

usePageSeo({
  title: 'Checadores',
  description:
    'As agências de checagem cujas checagens o Carimbo indexa, com link para cada uma e para o canal de envio.',
})
</script>

<template>
  <div class="page">
    <div class="prose">
      <h1 class="manchete">Checadores</h1>
      <p>
        O Carimbo só mostra checagens publicadas por estas agências. A contagem é de checagens
        indexadas pelo Carimbo, não do total que cada uma publicou.
        <NuxtLink to="/cobertura">Veja a cobertura por ano</NuxtLink>.
      </p>
    </div>

    <StateMessage v-if="error" kind="error" title="A lista de checadores não carregou agora." />
    <StateMessage v-else-if="checkers.length === 0" title="Nenhum checador cadastrado ainda." />
    <ul v-else class="checkers">
      <li v-for="checker in checkers" :key="checker.id" class="checker">
        <h2 class="checker__name">{{ checker.name }}</h2>
        <p class="muted">
          {{ formatNumber(checker.count) }}
          {{ checker.count === 1 ? 'checagem indexada' : 'checagens indexadas' }}
        </p>
        <p class="checker__links">
          <a :href="checker.homepage" rel="noopener" target="_blank">Site</a>
          <template v-if="checker.submitUrl">
            ·
            <a :href="checker.submitUrl" rel="noopener" target="_blank">Enviar algo para checar</a>
          </template>
          ·
          <NuxtLink :to="{ path: '/', query: { checador: checker.id } }"
            >Checagens no Carimbo</NuxtLink
          >
        </p>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 24px;
  max-width: 1080px;
  margin: 0 auto;
  padding: 24px 16px 40px;
}

.checkers {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.checker {
  display: grid;
  gap: 4px;
  padding: 16px;
  border: 1px solid var(--line);
  background: var(--panel);
}

.checker__name {
  font-size: 17px;
}
</style>
