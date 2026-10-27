<script setup lang="ts">
const { checkers, error } = useCheckers()
const withChannel = computed(() => checkers.value.filter((checker) => checker.submitUrl))
</script>

<template>
  <div class="submit">
    <p v-if="error" class="muted">
      A lista de canais não carregou agora. Veja os checadores em
      <NuxtLink to="/fontes">/fontes</NuxtLink>.
    </p>
    <ul v-else-if="withChannel.length" class="submit__list">
      <li v-for="checker in withChannel" :key="checker.id">
        <a :href="checker.submitUrl!" rel="noopener" target="_blank" class="button">
          {{ checker.name }}<span class="visually-hidden"> (abre o canal oficial em nova aba)</span>
        </a>
      </li>
    </ul>
    <p v-else class="muted">Nenhum canal oficial de envio cadastrado ainda.</p>
  </div>
</template>

<style scoped>
.submit__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
