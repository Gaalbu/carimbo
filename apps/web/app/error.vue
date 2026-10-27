<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const notFound = computed(() => props.error.statusCode === 404)

useHead({ title: notFound.value ? 'Página não encontrada · Carimbo' : 'Erro · Carimbo' })
</script>

<template>
  <NuxtLayout>
    <div class="page error-page">
      <p class="code">{{ error.statusCode }}</p>
      <h1 class="manchete">
        {{ notFound ? 'Não encontramos esta página.' : 'Algo deu errado do nosso lado.' }}
      </h1>
      <p>
        {{
          notFound
            ? 'O endereço pode ter mudado ou a checagem ainda não foi indexada pelo Carimbo.'
            : 'Tente de novo em instantes.'
        }}
      </p>
      <p>
        <NuxtLink to="/buscar">Buscar uma checagem</NuxtLink> ·
        <NuxtLink to="/" @click="clearError()">Voltar para o início</NuxtLink>
      </p>
    </div>
  </NuxtLayout>
</template>

<style scoped>
.error-page {
  max-width: 40rem;
  padding: 48px 16px;
}

.code {
  margin: 0;
  color: var(--fg-3);
  font-family: var(--stamp);
  font-size: var(--t-fig);
}
</style>
