<template>
  <!-- Desktop: filters/themes · feed · checkers (docs/PLANO.md §2 #2). Phones: feed only. -->
  <div class="cols">
    <aside v-if="$slots.left" class="cols__side cols__left" aria-label="Filtros e temas">
      <slot name="left" />
    </aside>
    <div class="cols__main">
      <slot />
    </div>
    <aside v-if="$slots.right" class="cols__side cols__right" aria-label="Checadores">
      <slot name="right" />
    </aside>
  </div>
</template>

<style scoped>
.cols {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

.cols__main {
  display: grid;
  align-content: start;
  gap: 28px;
  min-width: 0;
  padding: 20px 16px 32px;
}

.cols__side {
  display: none;
}

@media (min-width: 1024px) {
  .cols {
    grid-template-columns: 240px minmax(0, 1fr) 280px;
    max-width: 1320px;
    margin: 0 auto;
  }

  .cols__main {
    grid-column: 2;
    border-right: 1px solid var(--line);
    border-left: 1px solid var(--line);
  }

  .cols__side {
    position: sticky;
    top: 0;
    display: grid;
    align-content: start;
    gap: 28px;
    max-height: 100vh;
    overflow-y: auto;
    padding: 20px 16px;
  }

  .cols__left {
    grid-column: 1;
    grid-row: 1;
  }

  .cols__right {
    grid-column: 3;
    grid-row: 1;
  }
}
</style>
