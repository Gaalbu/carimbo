<script setup lang="ts">
import { isTypingTarget } from '~/composables/useShortcuts'

const route = useRoute()

// "/" focuses the search box from anywhere (docs/PLANO.md §5).
function onKeydown(event: KeyboardEvent) {
  if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
  if (isTypingTarget(event.target)) return
  event.preventDefault()
  const input = document.getElementById('busca-q')
  if (input) input.focus()
  else void navigateTo('/buscar')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="shell">
    <a class="skip" href="#conteudo">Pular para o conteúdo</a>
    <InkFilter />

    <header class="header">
      <div class="header__inner">
        <NuxtLink to="/" class="brand" :aria-current="route.path === '/' ? 'page' : undefined">
          <StampMark />
          <span class="brand__name">Carimbo</span>
          <span class="brand__tagline">o que circulou, carimbado</span>
        </NuxtLink>
        <ElectionSelector class="header__elections" />
        <nav class="header__nav" aria-label="Seções">
          <NuxtLink to="/buscar">Buscar</NuxtLink>
          <NuxtLink to="/temas">Temas</NuxtLink>
          <NuxtLink to="/como-funciona">Como funciona</NuxtLink>
        </nav>
        <ThemeToggle class="header__toggle" />
      </div>
    </header>

    <ScoreStrip />

    <main id="conteudo" class="main" tabindex="-1">
      <slot />
    </main>

    <SiteFooter />
    <TabBar />
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* The stamp animation starts at scale 1.4: never let it widen the page. */
  overflow-x: clip;
  padding-bottom: calc(53px + env(safe-area-inset-bottom));
}

.skip {
  position: absolute;
  top: -100px;
  left: 16px;
  z-index: 50;
  padding: 10px 14px;
  background: var(--fg);
  color: var(--bg);
  font-weight: 600;
}

.skip:focus {
  top: 8px;
}

.header {
  border-bottom: 1px solid var(--line);
}

.header__inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'brand toggle'
    'elections elections';
  align-items: center;
  gap: 4px 12px;
  max-width: 1320px;
  margin: 0 auto;
  padding: 10px 16px 4px;
}

.brand {
  grid-area: brand;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  text-decoration: none;
}

.brand__name {
  font-family: var(--stamp);
  font-size: 24px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.brand__tagline {
  overflow: hidden;
  color: var(--fg-3);
  font-family: var(--serif);
  font-size: 15px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.header__elections {
  grid-area: elections;
  margin: 0 -8px;
}

.header__nav {
  display: none;
}

.header__toggle {
  grid-area: toggle;
}

.main {
  flex: 1;
  min-width: 0;
}

.main:focus {
  outline: none;
}

@media (max-width: 400px) {
  .brand__tagline {
    display: none;
  }
}

@media (min-width: 1024px) {
  .shell {
    padding-bottom: 0;
  }

  .header__inner {
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    grid-template-areas: 'brand elections nav toggle';
    padding: 8px 16px;
  }

  .header__elections {
    margin: 0;
    justify-self: center;
  }

  .header__nav {
    display: flex;
    gap: 16px;
  }

  .header__nav a {
    color: var(--fg-2);
    font-weight: 600;
    text-decoration: none;
  }

  .header__nav a:hover,
  .header__nav a.router-link-active {
    color: var(--fg);
    text-decoration: underline;
  }
}
</style>
