import process from 'node:process';
import { fileURLToPath } from 'node:url';

export default defineNuxtConfig({
  compatibilityDate: '2026-01-22',

  modules: ['nuxt-auth-utils', '@pinia/nuxt'],

  runtimeConfig: {
    db: {
      sqlitePath: fileURLToPath(new URL('.data/local.db', import.meta.url))
    },
    databaseUrl: '',
    llm: {
      openaiApiKey: '',
      geminiApiKey: ''
    },
    storage: {
      blobReadWriteToken: '',
      baseUrl: 'http://localhost:3000/api/storage',
      baseDir: ''
    },
    session: {
      // Session duration: 7 days
      maxAge: 60 * 60 * 24 * 7,
      name: 'nuxt-session',
      password: 'change-me-in-production-min-32-chars',
      cookie: {
        sameSite: 'lax',
        // Secure in production (HTTPS), false in dev
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true
      }
    },
    oauth: {
      // Google OAuth configuration
      google: {
        clientId: '',
        clientSecret: ''
      }
    },
    public: {
      apiCallTimeoutMs: 10000
    }
  },

  typescript: {
    strict: true,
    typeCheck: false
  },

  alias: { '@layer/api': fileURLToPath(new URL('./', import.meta.url)) }
});
