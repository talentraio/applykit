import { fileURLToPath } from 'node:url';

export default defineNuxtConfig({
  compatibilityDate: '2026-01-22',

  modules: ['@nuxt/ui', '@nuxtjs/i18n', '@nuxt/image'],

  css: [fileURLToPath(new URL('./app/assets/css/main.css', import.meta.url))],

  // NuxtUI v4 configuration
  ui: {
    // Use default NuxtUI v4 settings
  },

  image: {
    dir: '.data',
    screens: {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536
    },
    domains: [
      'localhost',
      '127.0.0.1',
      'public.blob.vercel-storage.com',
      'blob.vercel-storage.com',
      'vercel-storage.com'
    ]
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
  components: [{ path: '@layer/ui/app/components', prefix: 'Ui' }]
});
