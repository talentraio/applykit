export default defineNuxtConfig({
  extends: ['..'],

  compatibilityDate: '2026-01-22',

  devtools: {
    enabled: true
  },

  typescript: {
    strict: true,
    typeCheck: true
  },

  future: {
    compatibilityVersion: 4
  }
})
