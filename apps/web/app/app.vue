<script setup lang="ts">
// Applies the saved theme before first paint, so the light theme never flashes dark.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('carimbo-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);var m=document.querySelector('meta[name="theme-color"]');if(m&&t==='light')m.setAttribute('content','#f7f6f3')}}catch(e){}})()`

useHead({
  titleTemplate: (title) => (title && title !== 'Carimbo' ? `${title} · Carimbo` : 'Carimbo'),
  script: [{ innerHTML: THEME_SCRIPT, tagPosition: 'head' }],
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
