<script setup lang="ts">
import { formatNumber } from '~/utils/format'

const { themes, error } = useThemes()
const route = useRoute()
</script>

<template>
  <section aria-labelledby="side-themes">
    <h2 id="side-themes" class="section-title">Temas</h2>
    <p v-if="error" class="micro muted">Temas indisponíveis no momento.</p>
    <p v-else-if="themes.length === 0" class="micro muted">Nenhum tema indexado ainda.</p>
    <ul v-else class="side-list">
      <li v-for="theme in themes" :key="theme.slug">
        <NuxtLink
          :to="`/tema/${theme.slug}`"
          :aria-current="route.path === `/tema/${theme.slug}` ? 'page' : undefined"
        >
          <span>{{ theme.name }}</span>
          <span class="muted">{{ formatNumber(theme.count) }}</span>
        </NuxtLink>
      </li>
    </ul>
    <NuxtLink to="/temas" class="micro">Todos os temas</NuxtLink>
  </section>
</template>

<style scoped>
.side-list a:hover span:first-child,
.side-list a[aria-current='page'] span:first-child {
  text-decoration: underline;
}
</style>
