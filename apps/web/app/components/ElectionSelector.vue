<script setup lang="ts">
import { ELECTION_YEARS } from '~/utils/elections'

const route = useRoute()

const current = computed(() => {
  const match = /^\/eleicao\/(\d{4})/.exec(route.path)
  return match ? Number(match[1]) : null
})
</script>

<template>
  <nav class="elections" aria-label="Recorte por eleição">
    <ul>
      <li v-for="year in ELECTION_YEARS" :key="year">
        <NuxtLink :to="`/eleicao/${year}`" :aria-current="current === year ? 'page' : undefined">
          {{ year }}
        </NuxtLink>
      </li>
      <li>
        <NuxtLink to="/" :aria-current="route.path === '/' ? 'page' : undefined">tudo</NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.elections {
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

ul {
  display: flex;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

a {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 8px;
  color: var(--fg-3);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

a:hover {
  color: var(--fg);
}

a[aria-current='page'] {
  color: var(--fg);
  box-shadow: inset 0 -2px 0 var(--fg);
}
</style>
