<script setup lang="ts">
import type { ClaimDetail } from '@carimbo/core'

import { archivedDate, dateOrMissing, formatDate, truncate } from '~/utils/format'
import { VERDICT_LABEL, distinctVerdicts } from '~/utils/verdict'

const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data: claim, error } = await useApi<ClaimDetail>(() => `/v1/claims/${slug.value}`)
const { names } = await useCheckers()

if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Checagem não encontrada', fatal: true })
}

function checkerName(id: string): string {
  return names.value[id] ?? id
}

// Different verdicts are listed side by side, never merged (docs/PLANO.md §4.5, regra 8).
const stampWords = computed(() =>
  claim.value
    ? distinctVerdicts(claim.value.reviews.map((review) => review.verdict))
        .map((verdict) => VERDICT_LABEL[verdict].toUpperCase())
        .join(' / ')
    : '',
)

const checkerList = computed(() =>
  claim.value ? [...new Set(claim.value.reviews.map((r) => checkerName(r.checkerId)))] : [],
)

const timeline = computed(() => {
  if (!claim.value) return []
  const dates = claim.value.reviews
    .map((review) => review.reviewDate)
    .filter((date): date is string => Boolean(date))
    .sort()
  const events: string[] = []
  if (dates[0]) events.push(`Primeira checagem em ${formatDate(dates[0])}`)
  if (dates.length > 1 && dates[dates.length - 1] !== dates[0]) {
    events.push(`Checagem mais recente em ${formatDate(dates[dates.length - 1])}`)
  }
  const count = checkerList.value.length
  events.push(count === 1 ? 'Checada por 1 agência' : `Checada por ${count} agências`)
  return events
})

const config = useRuntimeConfig()
const origin = (config.public.siteUrl || useRequestURL().origin).replace(/\/$/, '')
const pageUrl = computed(() => `${origin}/c/${slug.value}`)

const whatsappUrl = computed(() => {
  if (!claim.value) return ''
  const text = `${stampWords.value}: "${truncate(claim.value.claimText, 200)}"\nSegundo ${checkerList.value.join(', ')}. Veja no Carimbo: ${pageUrl.value}`
  return `https://wa.me/?text=${encodeURIComponent(text)}`
})

usePageSeo(() => {
  if (!claim.value) {
    return {
      title: 'Checagem indisponível',
      description: 'Não foi possível carregar esta checagem agora.',
    }
  }
  const text = truncate(claim.value.claimText, 140)
  return {
    title: `${stampWords.value}: ${text}`,
    socialTitle: `${stampWords.value}: ${text}`,
    description: `Segundo ${checkerList.value.join(', ')}. Veja o carimbo de cada checador e o link da checagem completa.`,
  }
})
</script>

<template>
  <div class="claim-page">
    <StateMessage
      v-if="error || !claim"
      kind="error"
      title="Não foi possível carregar esta checagem."
    >
      A API do Carimbo não respondeu. Tente de novo em alguns minutos ou
      <NuxtLink to="/">volte ao início</NuxtLink>.
    </StateMessage>

    <article v-else class="claim">
      <header class="claim__head">
        <p class="section-title">Alegação checada</p>
        <h1 class="claim__text">
          <q>{{ claim.claimText }}</q>
        </h1>
        <p v-if="claim.claimant" class="muted">Quem disse: {{ claim.claimant }}</p>
      </header>

      <section aria-labelledby="vereditos">
        <h2 id="vereditos" class="section-title">
          {{ claim.reviews.length === 1 ? 'O carimbo' : 'O carimbo de cada checador, lado a lado' }}
        </h2>
        <ul class="verdicts">
          <li v-for="review in claim.reviews" :key="review.id" class="verdict">
            <Stamp
              :verdict="review.verdict"
              :checker="checkerName(review.checkerId)"
              :date="review.reviewDate"
              size="lg"
            />
            <div class="verdict__meta">
              <p class="verdict__checker">
                <strong>{{ checkerName(review.checkerId) }}</strong
                >: {{ review.textualRating }}
              </p>
              <p class="muted">
                <time v-if="review.reviewDate" :datetime="review.reviewDate">{{
                  dateOrMissing(review.reviewDate)
                }}</time>
                <span v-else>data não informada</span>
              </p>
              <p v-if="review.headline" class="verdict__headline">{{ review.headline }}</p>
              <p v-if="review.archivedUrl" class="micro">
                <a :href="review.archivedUrl" rel="noopener" target="_blank">
                  Fonte arquivada<template v-if="archivedDate(review.archivedUrl)">
                    em {{ archivedDate(review.archivedUrl) }}</template
                  >
                </a>
              </p>
              <a :href="review.reviewUrl" class="button" rel="noopener" target="_blank">
                Ler a checagem completa<span class="visually-hidden">
                  em {{ checkerName(review.checkerId) }} (abre em nova aba)</span
                >
              </a>
            </div>
          </li>
        </ul>
      </section>

      <div class="claim__share">
        <a :href="whatsappUrl" class="button button--primary" rel="noopener" target="_blank">
          Mandar no WhatsApp
        </a>
        <p class="micro muted">Manda o carimbo e o link desta página para quem te enviou.</p>
      </div>

      <section aria-labelledby="linha-do-tempo">
        <h2 id="linha-do-tempo" class="section-title">Linha do tempo</h2>
        <ol class="timeline">
          <li v-for="event in timeline" :key="event">{{ event }}</li>
        </ol>
      </section>

      <section v-if="claim.related.length" aria-labelledby="relacionadas">
        <h2 id="relacionadas" class="section-title">Alegações parecidas</h2>
        <p class="micro muted">Parecidas, mas não agrupadas: podem ser alegações diferentes.</p>
        <ol class="related">
          <li v-for="item in claim.related" :key="item.slug">
            <ClaimCard :claim="item" :checker-names="names" />
          </li>
        </ol>
      </section>

      <p class="micro muted">
        O Carimbo não muda nenhuma avaliação: o carimbo vem da avaliação original de cada checador.
        <NuxtLink to="/como-funciona">Como funciona</NuxtLink>.
      </p>
    </article>
  </div>
</template>

<style scoped>
.claim-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px 40px;
}

.claim {
  display: grid;
  gap: 32px;
}

.claim__head {
  display: grid;
  gap: 8px;
}

.claim__head .section-title {
  margin: 0;
}

.claim__text {
  font-family: var(--serif);
  font-size: clamp(24px, 5vw, 34px);
  font-weight: 500;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.verdicts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.verdict {
  display: grid;
  align-content: start;
  justify-items: start;
  gap: 20px;
  padding: 28px 20px 20px;
  border: 1px solid var(--line);
  background: var(--panel);
}

.verdict__meta {
  display: grid;
  justify-items: start;
  gap: 6px;
}

.verdict__checker strong {
  font-weight: 600;
}

.verdict__headline {
  color: var(--fg-2);
  font-family: var(--serif);
  font-size: 15px;
}

.verdict .button {
  margin-top: 8px;
}

.claim__share {
  display: grid;
  justify-items: start;
  gap: 6px;
}

.timeline {
  margin: 0;
  padding: 0 0 0 18px;
  color: var(--fg-2);
}

.related {
  margin: 8px -16px 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--line);
}
</style>
