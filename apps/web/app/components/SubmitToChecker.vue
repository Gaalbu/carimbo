<script setup lang="ts">
const { checkers, error } = useCheckers()
</script>

<template>
  <div class="submit">
    <p v-if="error" class="muted">
      A lista de canais não carregou agora. Veja os checadores em
      <NuxtLink to="/fontes">/fontes</NuxtLink>.
    </p>
    <ul v-else-if="checkers.length" class="submit__list">
      <!-- Official submission channel when there is one; otherwise the checker's site. -->
      <li v-for="checker in checkers" :key="checker.id">
        <a
          :href="checker.submitUrl ?? checker.homepage"
          rel="noopener"
          target="_blank"
          class="button"
          :class="{ 'button--primary': checker.submitUrl }"
        >
          {{ checker.name }}
          <span class="micro">{{ checker.submitUrl ? 'canal de envio' : 'site' }}</span>
          <span class="visually-hidden"> (abre em nova aba)</span>
        </a>
      </li>
    </ul>
    <p v-else class="muted">Nenhum checador cadastrado ainda.</p>
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

.submit__list .micro {
  font-weight: 400;
  opacity: 0.8;
}
</style>
