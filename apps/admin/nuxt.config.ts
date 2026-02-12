import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { applySsrHmrPort } from '@int/npm-utils';

const dataDir = resolve(fileURLToPath(new URL('.', import.meta.url)), '.data');
mkdirSync(dataDir, { recursive: true });
const adminHmrPort = Number(process.env.NUXT_ADMIN_HMR_PORT ?? '24679');
const adminSsrHmrPort = Number(process.env.NUXT_ADMIN_SSR_HMR_PORT ?? '24681');

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

  modules: ['@pinia/nuxt', '@nuxtjs/i18n'],

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

  vite: {
    server: {
      hmr: {
        port: adminHmrPort,
        clientPort: adminHmrPort
      }
    }
  },

  hooks: {
    'vite:extend': function ({ config }) {
      applySsrHmrPort(config, adminSsrHmrPort);
    }
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
