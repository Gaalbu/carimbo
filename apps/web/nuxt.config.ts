// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ['~/assets/css/fonts.css', '~/assets/css/tokens.css', '~/assets/css/base.css'],
  runtimeConfig: {
    public: {
      // NUXT_PUBLIC_API_BASE overrides it at runtime.
      apiBase: 'http://127.0.0.1:3001',
      // NUXT_PUBLIC_SITE_URL: absolute origin for og:url/og:image; falls back to the request host.
      siteUrl: '',
    },
  },
  // Pages are rendered on the server and cached at the edge (docs/PLANO.md §2 #14). Live
  // counters must never live in these cached pages.
  routeRules: {
    '/': { swr: 60 },
    '/c/**': { swr: 600 },
    '/tema/**': { swr: 300 },
    '/eleicao/**': { swr: 600 },
    '/temas': { swr: 600 },
    '/fontes': { swr: 600 },
    '/cobertura': { swr: 600 },
    '/como-funciona': { swr: 3600 },
    '/dados': { swr: 3600 },
  },
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
        { name: 'color-scheme', content: 'dark light' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
      ],
    },
  },
})
