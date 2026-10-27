<script setup lang="ts">
import type { Verdict } from '@carimbo/core'

import { formatDate } from '~/utils/format'
import { VERDICT_LABEL } from '~/utils/verdict'

const props = withDefaults(
  defineProps<{
    verdict: Verdict
    /** Checker name for the accessible label ("Falso, segundo Aos Fatos, …"). */
    checker?: string | null
    /** Review date; `null` means "not informed" and is announced as such. Omit to leave it out. */
    date?: string | null
    size?: 'sm' | 'md' | 'lg'
    /** Solid stamp: the word is printed in `--bg` over the stamp colour. */
    filled?: boolean
    /** "Bater o carimbo" on mount; prefers-reduced-motion turns it off in CSS. */
    animate?: boolean
  }>(),
  { checker: null, date: undefined, size: 'md', filled: false, animate: true },
)

const label = computed(() => VERDICT_LABEL[props.verdict])

const ariaLabel = computed(() => {
  const parts = [label.value]
  if (props.checker) parts.push(`segundo ${props.checker}`)
  if (props.date !== undefined) parts.push(formatDate(props.date) ?? 'data não informada')
  return parts.join(', ')
})
</script>

<template>
  <span
    class="stamp"
    :class="[`stamp--${size}`, { 'stamp--filled': filled, 'stamp--animate': animate }]"
    :data-verdict="verdict"
    role="img"
    :aria-label="ariaLabel"
  >
    <span class="stamp__word" aria-hidden="true">{{ label }}</span>
  </span>
</template>

<style scoped>
.stamp {
  --stamp-color: var(--outro);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  padding: 0.2em 0.5em 0.15em;
  border: 0.18em double var(--stamp-color);
  border-radius: 3px;
  color: var(--stamp-color);
  font-family: var(--stamp);
  font-weight: 400;
  line-height: 1.05;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  text-align: center;
  white-space: nowrap;
  transform: rotate(-3deg);
  /* Ink texture: the SVG filter is defined once in the layout (InkFilter.vue). */
  filter: url('#carimbo-ink');
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

.stamp--sm {
  font-size: 13px;
  border-width: 3px;
  /* Small stamps stay crisp: texture would cost legibility at this size. */
  filter: none;
}

.stamp--md {
  font-size: 20px;
  border-width: 4px;
}

.stamp--lg {
  font-size: clamp(30px, 9vw, 48px);
  border-width: 6px;
  white-space: normal;
}

.stamp--filled {
  border-color: var(--bg);
  background: var(--stamp-color);
  box-shadow: 0 0 0 2px var(--stamp-color);
  color: var(--bg);
}

.stamp--animate {
  animation: stamp-hit 180ms var(--ease-out) both;
}

@keyframes stamp-hit {
  from {
    opacity: 0;
    transform: rotate(-3deg) scale(1.4);
  }

  to {
    opacity: 1;
    transform: rotate(-3deg) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .stamp--animate {
    animation: none;
  }
}
</style>
