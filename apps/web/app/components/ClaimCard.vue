<script setup lang="ts">
import type { ClaimSummary } from '@carimbo/core'

import { archivedDate, dateOrMissing } from '~/utils/format'

const props = withDefaults(
  defineProps<{
    claim: ClaimSummary
    /** checkerId → display name; unknown ids fall back to the id itself. */
    checkerNames?: Record<string, string>
    headingLevel?: 'h2' | 'h3'
  }>(),
  { checkerNames: () => ({}), headingLevel: 'h3' },
)

function checkerName(id: string): string {
  return props.checkerNames[id] ?? id
}
</script>

<template>
  <article class="card" data-feed-item>
    <ul class="card__stamps" aria-label="Carimbos dos checadores">
      <li v-for="review in claim.reviews" :key="review.id">
        <Stamp
          :verdict="review.verdict"
          :checker="checkerName(review.checkerId)"
          :date="review.reviewDate"
          size="sm"
        />
      </li>
    </ul>

    <component :is="headingLevel" class="card__claim">
      <NuxtLink :to="`/c/${claim.slug}`" class="card__link">
        <q>{{ claim.claimText }}</q>
      </NuxtLink>
    </component>
    <p v-if="claim.claimant" class="card__claimant">Quem disse: {{ claim.claimant }}</p>

    <ul class="card__reviews">
      <li v-for="review in claim.reviews" :key="review.id" class="card__review">
        <span class="card__rating">
          <strong>{{ checkerName(review.checkerId) }}</strong
          >: {{ review.textualRating }}
        </span>
        <span class="card__sep" aria-hidden="true">·</span>
        <time v-if="review.reviewDate" :datetime="review.reviewDate">{{
          dateOrMissing(review.reviewDate)
        }}</time>
        <span v-else class="card__missing">data não informada</span>
        <template v-if="review.archivedUrl">
          <span class="card__sep" aria-hidden="true">·</span>
          <a :href="review.archivedUrl" rel="noopener" target="_blank" class="card__archived">
            fonte arquivada<template v-if="archivedDate(review.archivedUrl)">
              em {{ archivedDate(review.archivedUrl) }}</template
            >
          </a>
        </template>
      </li>
    </ul>
  </article>
</template>

<style scoped>
.card {
  display: grid;
  gap: 10px;
  padding: 18px 16px;
  border-bottom: 1px solid var(--line);
}

.card:focus-within {
  background: var(--panel);
}

.card__stamps {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  margin: 0;
  padding: 2px 0 0;
  list-style: none;
}

.card__claim {
  font-family: var(--serif);
  font-size: 19px;
  font-weight: 500;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.card__link {
  text-decoration: none;
}

.card__link:hover q {
  text-decoration: underline;
  text-decoration-color: var(--line-2);
  text-underline-offset: 4px;
}

.card__claimant {
  color: var(--fg-3);
  font-size: 13px;
}

.card__reviews {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--fg-3);
  font-size: 13px;
}

.card__rating strong {
  color: var(--fg-2);
  font-weight: 600;
}

.card__sep {
  margin: 0 6px;
}

.card__missing {
  font-style: italic;
}

.card__archived {
  color: var(--fg-2);
}
</style>
