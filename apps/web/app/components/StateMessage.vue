<script setup lang="ts">
withDefaults(
  defineProps<{
    kind?: 'empty' | 'error'
    title: string
  }>(),
  { kind: 'empty' },
)
</script>

<template>
  <div class="state" :class="`state--${kind}`" :role="kind === 'error' ? 'alert' : 'status'">
    <p class="state__title">{{ title }}</p>
    <div v-if="$slots.default" class="state__body"><slot /></div>
  </div>
</template>

<style scoped>
.state {
  padding: 20px;
  border: 1px dashed var(--line-2);
  color: var(--fg-2);
}

.state--error {
  border-style: solid;
  border-color: var(--falso);
}

.state__title {
  color: var(--fg);
  font-weight: 600;
}

.state__body {
  margin-top: 6px;
  color: var(--fg-3);
}
</style>
