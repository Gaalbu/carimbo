<script setup lang="ts">
import { formatNumber } from '~/utils/format'

const { checkers, error } = useCheckers()
</script>

<template>
  <section aria-labelledby="side-checkers">
    <h2 id="side-checkers" class="section-title">Checadores no Carimbo</h2>
    <p v-if="error" class="micro muted">Lista de checadores indisponível no momento.</p>
    <p v-else-if="checkers.length === 0" class="micro muted">Nenhum checador cadastrado ainda.</p>
    <ul v-else class="side-list">
      <li v-for="checker in checkers" :key="checker.id">
        <NuxtLink :to="{ path: '/', query: { checador: checker.id } }">
          <span>{{ checker.name }}</span>
          <span class="muted">{{ formatNumber(checker.count) }}</span>
        </NuxtLink>
      </li>
    </ul>
    <p class="micro muted">
      Contagem de checagens indexadas pelo Carimbo, não do total publicado por cada agência.
    </p>
    <p class="micro">
      <NuxtLink to="/fontes">Sobre os checadores</NuxtLink> ·
      <NuxtLink to="/cobertura">Cobertura por ano</NuxtLink>
    </p>
  </section>
</template>

<style scoped>
.side-list a:hover span:first-child {
  text-decoration: underline;
}

p + p {
  margin-top: 8px;
}
</style>
