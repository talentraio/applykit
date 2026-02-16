import { fileURLToPath } from 'node:url';

export default defineNuxtConfig({
  compatibilityDate: '2026-01-22',

  extends: [
    '@int/ui',
    '@int/api',
    '@int/utils',
    // Internal layers (order matters: _base must be first)
    './layers/_base',
    './layers/auth',
    './layers/profile',
    './layers/resume',
    './layers/landing',
    './layers/vacancy',
    './layers/static'
  ],

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/i18n',
    '@nuxtjs/seo',
    '@nuxt/image',
    '@nuxtjs/device',
    '@nuxt/fonts',
    '@vueuse/nuxt'
  ],

  fonts: {
    families: [
      {
        name: 'Manrope',
        provider: 'google',
        weights: [400, 500, 600, 700, 800],
        styles: ['normal'],
        subsets: ['latin'],
        global: true
      },
      {
        name: 'Sora',
        provider: 'google',
        weights: [400, 500, 600, 700, 800],
        styles: ['normal'],
        subsets: ['latin'],
        global: true
      }
    ]
  },

  image: {
    densities: [1, 2],
    format: ['webp'],
    domains: [
      'localhost',
      'localhost:3002',
      '127.0.0.1',
      'public.blob.vercel-storage.com',
      'blob.vercel-storage.com',
      'vercel-storage.com',
      'vercel.app'
    ]
  },

  runtimeConfig: {
    session: {
      name: 'nuxt-session-site'
    },
    redirects: {
      authDefault: '/dashboard'
    },
    public: {
      contentConfig: {
        supportEmail: 'talentraio@gmail.com',
        serviceName: 'ApplyKit',
        operatorDescription: '',
        operatorCountry: 'DK',
        emailDeliveryProvider: '',
        suppressionTtlDays: 180,
        securityLogRetentionDays: 90,
        backupRetentionDays: 30,
        termsEffectiveDate: '13.02.2026',
        termsLastUpdated: '13.02.2026',
        privacyEffectiveDate: '13.02.2026',
        privacyLastUpdated: '13.02.2026'
      }
    }
  },

  // Temporary SEO placeholders until production launch.
  site: {
    url: 'https://example.com',
    name: 'ApplyKit',
    indexable: false
  },

  robots: {
    disallow: ['/']
  },

  sitemap: {
    enabled: false
  },

  devtools: {
    enabled: true
  },

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
    // Disable typeCheck in dev to avoid blocking on known NuxtUI v4 type issues
    // Run `pnpm typecheck` separately for type validation
    typeCheck: false
  },

  alias: { '@site': fileURLToPath(new URL('./', import.meta.url)) },
  pinia: {
    storesDirs: [
      fileURLToPath(new URL('./stores/*', import.meta.url)),
      fileURLToPath(new URL('./stores/**', import.meta.url)),
      fileURLToPath(new URL('./layers/**/stores/**', import.meta.url))
    ]
  }
});
