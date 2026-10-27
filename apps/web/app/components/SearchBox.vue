<script setup lang="ts">
const props = withDefaults(defineProps<{ initial?: string; autofocus?: boolean }>(), {
  initial: '',
  autofocus: false,
})

const query = ref(props.initial)
const input = ref<HTMLInputElement | null>(null)
// The no-JS form must post under the app base (`/carimbo/` on GitHub Pages).
const action = withAppBase(useRuntimeConfig().app.baseURL, 'buscar')

watch(
  () => props.initial,
  (value) => {
    query.value = value
  },
)

onMounted(() => {
  // Hydration keeps the prerendered (empty) value of a static page; show the query from the URL.
  if (input.value && input.value.value !== query.value) input.value.value = query.value
  if (props.autofocus) input.value?.focus()
})

async function submit() {
  const q = query.value.trim()
  await navigateTo(q ? { path: '/buscar', query: { q } } : '/buscar')
}
</script>

<template>
  <!-- A plain GET form, so search also works before (or without) JavaScript. -->
  <form class="search" role="search" :action="action" method="get" @submit.prevent="submit">
    <label for="busca-q" class="search__label">Cole aqui o que você recebeu</label>
    <div class="search__row">
      <input
        id="busca-q"
        ref="input"
        v-model="query"
        class="search__input"
        type="search"
        name="q"
        placeholder="Ex.: urna eletrônica foi hackeada"
        autocomplete="off"
        enterkeyhint="search"
        aria-describedby="busca-dica"
      />
      <button class="button button--primary" type="submit">Buscar</button>
    </div>
    <p id="busca-dica" class="micro muted">
      Procura entre as checagens já publicadas. Atalho: tecla <kbd>/</kbd>.
    </p>
  </form>
</template>

<style scoped>
.search {
  display: grid;
  gap: 8px;
}

.search__label {
  font-weight: 600;
}

.search__row {
  display: flex;
  gap: 8px;
}

.search__input {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--line-2);
  background: var(--panel);
  font-size: 16px;
}

.search__input::placeholder {
  color: var(--fg-3);
}

.search__input:focus-visible {
  outline-offset: 0;
}

kbd {
  padding: 0 4px;
  border: 1px solid var(--line-2);
  font-family: var(--sans);
}
</style>
