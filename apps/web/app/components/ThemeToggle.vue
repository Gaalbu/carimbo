<script setup lang="ts">
type Theme = 'dark' | 'light'

const STORAGE_KEY = 'carimbo-theme'
const THEME_COLOR: Record<Theme, string> = { dark: '#0f0e0d', light: '#f7f6f3' }

// Dark is the default; the saved choice is applied before paint by the script in app.vue.
const theme = ref<Theme>('dark')

onMounted(() => {
  theme.value = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
})

function toggle() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = theme.value
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLOR[theme.value])
  try {
    localStorage.setItem(STORAGE_KEY, theme.value)
  } catch {
    // Private mode or blocked storage: the choice simply is not remembered.
  }
}
</script>

<template>
  <button
    class="toggle"
    type="button"
    :aria-pressed="theme === 'light'"
    aria-label="Tema claro"
    :title="theme === 'light' ? 'Voltar ao tema escuro' : 'Usar tema claro'"
    @click="toggle"
  >
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2" />
      <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
    </svg>
  </button>
</template>

<style scoped>
.toggle {
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--line-2);
  background: transparent;
  cursor: pointer;
}

.toggle:hover {
  border-color: var(--fg-3);
}
</style>
