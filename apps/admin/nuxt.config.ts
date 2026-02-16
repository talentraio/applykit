import { fileURLToPath } from 'node:url';
// import { applySsrHmrPort } from '@int/npm-utils';
// const adminHmrPort = Number(process.env.NUXT_ADMIN_HMR_PORT ?? '24679');
// const adminSsrHmrPort = Number(process.env.NUXT_ADMIN_SSR_HMR_PORT ?? '24681');

export default defineNuxtConfig({
  compatibilityDate: '2026-01-22',

  extends: [
    '@int/ui',
    '@int/api',
    // Internal layers (order matters: _base must be first)
    './layers/_base',
    './layers/auth',
    './layers/users',
    './layers/llm',
    './layers/system',
    './layers/roles'
  ],

  modules: ['@pinia/nuxt', '@nuxtjs/i18n', '@nuxt/image'],

  image: {
    densities: [1, 2],
    format: ['webp'],
    domains: [
      'localhost',
      '127.0.0.1',
      'public.blob.vercel-storage.com',
      'blob.vercel-storage.com',
      'vercel-storage.com'
    ]
  },

  runtimeConfig: {
    session: {
      name: 'nuxt-session-admin'
    },
    redirects: {
      authDefault: '/'
    }
  },

  devtools: {
    enabled: true
  },

  // vite: {
  //   server: {
  //     hmr: {
  //       port: adminHmrPort,
  //       clientPort: adminHmrPort
  //     }
  //   }
  // },

  // hooks: {
  //   'vite:extend': function ({ config }) {
  //     applySsrHmrPort(config, adminSsrHmrPort);
  //   }
  // },

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

  alias: { '@admin/system': fileURLToPath(new URL('./', import.meta.url)) },
  pinia: {
    storesDirs: [
      fileURLToPath(new URL('./stores/*', import.meta.url)),
      fileURLToPath(new URL('./stores/**', import.meta.url)),
      fileURLToPath(new URL('./layers/**/stores/**', import.meta.url))
    ]
  }
});
