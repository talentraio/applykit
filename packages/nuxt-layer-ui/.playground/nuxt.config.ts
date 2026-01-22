export default defineNuxtConfig({
  extends: ['..'],

  compatibilityDate: '2024-04-03',

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
