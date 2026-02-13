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

  modules: ['@pinia/nuxt', '@nuxtjs/i18n', '@nuxtjs/device', '@vueuse/nuxt'],

  runtimeConfig: {
    session: {
      name: 'nuxt-session-site'
    },
    redirects: {
      authDefault: '/dashboard'
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
