<script setup lang="ts">
interface StampSample {
  verdict: 'false' | 'out_of_context' | 'true' | 'unknown'
  label: string
}

const stamps: readonly StampSample[] = [
  { verdict: 'false', label: 'Falso' },
  { verdict: 'out_of_context', label: 'Fora de contexto' },
  { verdict: 'true', label: 'Verdadeiro' },
  { verdict: 'unknown', label: 'Veja a checagem' },
]
</script>

<template>
  <main class="home">
    <h1 class="title">Carimbo</h1>
    <p class="tagline">O que circulou, carimbado.</p>
    <ul class="stamps" aria-label="Carimbos usados nas checagens">
      <li v-for="stamp in stamps" :key="stamp.verdict" class="stamp" :data-verdict="stamp.verdict">
        {{ stamp.label }}
      </li>
    </ul>
  </main>
</template>

<style scoped>
.home {
  max-width: 40rem;
  margin: 0 auto;
  padding: 48px 16px;
}

.title {
  margin: 0;
  font-family: var(--stamp);
  font-size: var(--t-fig);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.tagline {
  margin: 8px 0 32px;
  font-family: var(--serif);
  font-size: var(--t-manchete);
  color: var(--fg-2);
}

.stamps {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.stamp {
  --stamp-color: var(--outro);
  padding: 4px 10px;
  border: 3px double var(--stamp-color);
  color: var(--stamp-color);
  font-family: var(--stamp);
  font-size: var(--t-body);
  text-transform: uppercase;
  transform: rotate(-3deg);
}

.stamp[data-verdict='false'] {
  --stamp-color: var(--falso);
}

.stamp[data-verdict='out_of_context'] {
  --stamp-color: var(--contexto);
}

.stamp[data-verdict='true'] {
  --stamp-color: var(--verdadeiro);
}
</style>
