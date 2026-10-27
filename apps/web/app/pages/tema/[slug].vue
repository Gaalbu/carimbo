<script setup lang="ts">
const route = useRoute()
const slug = String(route.params.slug)

const { themes, error } = useThemes()
const theme = computed(() => themes.value.find((item) => item.slug === slug))
const name = computed(() => theme.value?.name ?? slug)

usePageSeo(() => ({
  title: `Tema: ${name.value}`,
  description: `Checagens sobre ${name.value} indexadas pelo Carimbo, com o carimbo e o link de cada checador.`,
}))
</script>

<template>
  <ThreeColumn>
    <template #left>
      <SideThemes />
    </template>

    <header class="theme-head">
      <p class="section-title">Tema</p>
      <h1 class="manchete">{{ name }}</h1>
      <p v-if="error" class="micro muted">A lista de temas não carregou; o feed abaixo continua.</p>
      <p v-else-if="!theme" class="micro muted">Este tema ainda não tem checagens indexadas.</p>
    </header>

    <ClaimFeed :theme="slug" :title="`Checagens sobre ${name}`" />

    <template #right>
      <SideCheckers />
    </template>
  </ThreeColumn>
</template>

<style scoped>
.theme-head {
  display: grid;
  gap: 6px;
}

.theme-head .section-title {
  margin: 0;
}
</style>
