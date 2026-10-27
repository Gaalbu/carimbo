<script setup lang="ts">
const { checkers } = useCheckers()

const credit = computed(() => {
  const names = checkers.value.map((checker) => checker.name)
  if (names.length === 0) return 'Checagens publicadas por agências brasileiras de checagem.'
  if (names.length <= 4) return `Checagens de ${names.join(', ')}.`
  return `Checagens de ${names.slice(0, 4).join(', ')}, …`
})
</script>

<template>
  <footer class="footer">
    <div class="footer__inner">
      <p>
        <strong>{{ credit }}</strong> O Carimbo não checa nada: mostra o veredito de quem checou,
        com link.
      </p>
      <nav aria-label="Rodapé">
        <ul class="footer__links">
          <li><NuxtLink to="/como-funciona">Como funciona</NuxtLink></li>
          <li><NuxtLink to="/fontes">Checadores</NuxtLink></li>
          <li><NuxtLink to="/cobertura">Cobertura</NuxtLink></li>
          <li><NuxtLink to="/dados">Dados abertos</NuxtLink></li>
        </ul>
      </nav>
      <p class="muted">
        Feito por Gaalbu ·
        <a href="https://github.com/Gaalbu" rel="me noopener">GitHub</a>
      </p>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--line);
  color: var(--fg-2);
  font-size: 13px;
}

.footer__inner {
  display: grid;
  gap: 10px;
  max-width: 1320px;
  margin: 0 auto;
  padding: 24px 16px;
}

.footer__links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
