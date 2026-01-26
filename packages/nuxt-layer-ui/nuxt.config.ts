import { fileURLToPath } from 'node:url';

export default defineNuxtConfig({
  compatibilityDate: '2026-01-22',

  modules: ['@nuxt/ui', '@nuxtjs/i18n'],

  // NuxtUI v4 configuration
  ui: {
    // Use default NuxtUI v4 settings
  },

  // i18n configuration
  i18n: {
    defaultLocale: 'en',
    strategy: 'no_prefix',
    langDir: 'locales',
    locales: [
      {
        code: 'en',
        name: 'English',
        file: 'en.json'
      }
    ],
    detectBrowserLanguage: false
  },

  typescript: {
    strict: true,
    typeCheck: false
  },

  alias: { '@layer/ui': fileURLToPath(new URL('./', import.meta.url)) },
  components: [{ path: '@layer/ui/components', prefix: 'Ui' }]
});
