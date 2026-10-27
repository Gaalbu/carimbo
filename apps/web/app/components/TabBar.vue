<script setup lang="ts">
const route = useRoute()

const tabs = [
  { to: '/', label: 'Agora', match: (path: string) => path === '/' || path.startsWith('/eleicao') },
  { to: '/buscar', label: 'Buscar', match: (path: string) => path.startsWith('/buscar') },
  {
    to: '/temas',
    label: 'Temas',
    match: (path: string) => path.startsWith('/tema'),
  },
  {
    to: '/como-funciona',
    label: 'Sobre',
    match: (path: string) =>
      ['/como-funciona', '/fontes', '/cobertura', '/dados'].some((prefix) =>
        path.startsWith(prefix),
      ),
  },
]
</script>

<template>
  <nav class="tabbar" aria-label="Navegação principal">
    <ul>
      <li v-for="tab in tabs" :key="tab.to">
        <NuxtLink :to="tab.to" :aria-current="tab.match(route.path) ? 'page' : undefined">
          {{ tab.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed;
  inset: auto 0 0;
  z-index: 20;
  padding-bottom: env(safe-area-inset-bottom);
  border-top: 1px solid var(--line-2);
  background: var(--panel);
}

ul {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin: 0;
  padding: 0;
  list-style: none;
}

a {
  display: grid;
  place-items: center;
  min-height: 52px;
  color: var(--fg-3);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

a[aria-current='page'] {
  color: var(--fg);
  box-shadow: inset 0 2px 0 var(--fg);
}

@media (min-width: 1024px) {
  .tabbar {
    display: none;
  }
}
</style>
