// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/tokens.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'Carimbo',
      meta: [
        {
          name: 'description',
          content: 'O que circulou, carimbado: checagens publicadas por agências brasileiras.',
        },
        { name: 'theme-color', content: '#0f0e0d' },
      ],
    },
  },
})
