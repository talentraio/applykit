import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const dataDir = resolve(fileURLToPath(new URL('.', import.meta.url)), '.data');
mkdirSync(dataDir, { recursive: true });
const adminHmrPort = Number(process.env.NUXT_ADMIN_HMR_PORT ?? '24679');
const adminSsrHmrPort = Number(process.env.NUXT_ADMIN_SSR_HMR_PORT ?? '24681');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object';

const applySsrHmrPort = (config: unknown, port: number) => {
  if (!isRecord(config)) {
    return;
  }

  const environments = config.environments;
  if (!isRecord(environments)) {
    return;
  }

  const ssrEnvironment = environments.ssr;
  if (!isRecord(ssrEnvironment)) {
    return;
  }

  const server = ssrEnvironment.server;
  if (!isRecord(server)) {
    return;
  }

  const hmr = server.hmr;
  if (hmr === false) {
    return;
  }

  if (!isRecord(hmr)) {
    server.hmr = {
      port,
      clientPort: port
    };
    return;
  }

  hmr.port = port;
  hmr.clientPort = port;
};

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
      name: process.env.NODE_ENV === 'development' ? 'nuxt-session-admin' : 'nuxt-session'
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
