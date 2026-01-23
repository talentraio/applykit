export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',

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
    lazy: false,
    detectBrowserLanguage: false
  },

  typescript: {
    strict: true,
    typeCheck: true
  }
})
