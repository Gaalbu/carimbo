import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        // Relative API base, so `registerEndpoint` intercepts every API call in tests.
        overrides: { runtimeConfig: { public: { apiBase: '', siteUrl: 'https://carimbo.test' } } },
      },
    },
  },
})
