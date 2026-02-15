import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = resolve(fileURLToPath(new URL('.', import.meta.url)), '.data');
mkdirSync(dataDir, { recursive: true });

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

  modules: ['@pinia/nuxt', '@nuxtjs/i18n', '@nuxtjs/device', '@nuxt/fonts', '@vueuse/nuxt'],

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

  devtools: {
    enabled: true
  },

  image: {
    dir: dataDir
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
