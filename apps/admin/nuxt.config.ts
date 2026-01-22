export default defineNuxtConfig({
  extends: [
    '@int/ui',
    '@int/api'
  ],

  compatibilityDate: '2024-04-03',

  devtools: {
    enabled: true
  },

  typescript: {
    strict: true,
    typeCheck: true
  },
})
