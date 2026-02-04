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
    // Internal layers (order matters: _base must be first)
    './layers/_base',
    './layers/auth',
    './layers/users',
    './layers/system',
    './layers/roles'
  ],

  modules: ['@pinia/nuxt'],

  runtimeConfig: {
    redirects: {
      authDefault: '/'
    }
  },

  devtools: {
    enabled: true
  },

  image: {
    dir: dataDir
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
