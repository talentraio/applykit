export default defineNuxtConfig({
  extends: [
    '@int/ui',
    '@int/api',
    // Internal layers (order matters: _base must be first)
    './layers/_base',
    './layers/auth',
    './layers/users',
    './layers/system',
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
