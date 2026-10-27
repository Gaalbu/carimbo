<script setup lang="ts">
import { formatNumber } from '~/utils/format'

const { themes, error } = useThemes()

usePageSeo({
  title: 'Temas',
  description:
    'Urna e eleição, saúde, economia e outros temas das checagens indexadas pelo Carimbo.',
})
</script>

<template>
  <div class="page">
    <h1 class="manchete">Temas</h1>
    <StateMessage v-if="error" kind="error" title="Os temas não carregaram agora." />
    <StateMessage
      v-else-if="themes.length === 0"
      title="Ainda não há temas com checagens indexadas."
    />
    <ul v-else class="themes">
      <li v-for="theme in themes" :key="theme.slug">
        <NuxtLink :to="`/tema/${theme.slug}`" class="theme">
          <span class="theme__name">{{ theme.name }}</span>
          <span class="muted">
            {{ formatNumber(theme.count) }} {{ theme.count === 1 ? 'checagem' : 'checagens' }}
          </span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 20px;
  max-width: 760px;
  margin: 0 auto;
  padding: 24px 16px 40px;
}

.themes {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--line);
}

.theme {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
  text-decoration: none;
}

.theme__name {
  font-family: var(--serif);
  font-size: 19px;
}

.theme:hover .theme__name {
  text-decoration: underline;
}
</style>
