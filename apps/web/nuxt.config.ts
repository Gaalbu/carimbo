// https://nuxt.com/docs/api/configuration/nuxt-config
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { buildSnapshot, ELECTION_YEARS, THEME_SLUGS, type ReviewStore } from '@carimbo/core'

import { withAppBase } from './app/utils/base-url'

const PUBLIC_DIR = fileURLToPath(new URL('public', import.meta.url))
// Pages serves the site under /<repo>/; every public URL below must carry the base.
const BASE_URL = process.env.NUXT_APP_BASE_URL ?? '/'
/** Static build (`npm run generate:static`): path of the store file, relative to the base. */
const STATIC_DATA = process.env.NUXT_PUBLIC_STATIC_DATA ?? ''

/** Every page of the static build: the crawler only finds what the home page links to. */
function staticRoutes(): string[] {
  if (!STATIC_DATA) return []
  const store = JSON.parse(readFileSync(`${PUBLIC_DIR}/${STATIC_DATA}`, 'utf8')) as ReviewStore
  return [
    '/',
    '/buscar',
    '/temas',
    '/fontes',
    '/cobertura',
    '/como-funciona',
    '/dados',
    '/sobre',
    ...THEME_SLUGS.map((slug) => `/tema/${slug}`),
    ...ELECTION_YEARS.map((year) => `/eleicao/${String(year)}`),
    ...buildSnapshot(store).claims.map((claim) => `/c/${claim.slug}`),
  ]
}

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ['~/assets/css/fonts.css', '~/assets/css/tokens.css', '~/assets/css/base.css'],
  runtimeConfig: {
    // Server-only: where the prerenderer reads the static store file from.
    staticDataDir: PUBLIC_DIR,
    public: {
      // NUXT_PUBLIC_STATIC_DATA: store file (relative to the app base) that replaces the API.
      staticData: STATIC_DATA,
      // NUXT_PUBLIC_API_BASE overrides it at runtime.
      apiBase: 'http://127.0.0.1:3001',
      // NUXT_PUBLIC_SITE_URL: absolute origin for og:url/og:image; falls back to the request host.
      siteUrl: '',
    },
  },
  // Pages are rendered on the server and cached at the edge (docs/PLANO.md §2 #14). Live
  // counters must never live in these cached pages.
  routeRules: STATIC_DATA
    ? {}
    : {
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
  ...(STATIC_DATA
    ? {
        nitro: {
          prerender: {
            crawlLinks: true,
            routes: staticRoutes(),
            // The published data files are copied from public/, not rendered.
            ignore: [/\/dados\/reviews\.(json|csv)$/],
            failOnError: true,
          },
        },
      }
    : {}),
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
        { rel: 'icon', type: 'image/svg+xml', href: withAppBase(BASE_URL, 'favicon.svg') },
        { rel: 'icon', href: withAppBase(BASE_URL, 'favicon.ico'), sizes: '32x32' },
      ],
    },
  },
})
