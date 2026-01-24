import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2026-01-22',

  extends: [
    '@int/ui',
    '@int/api',
    // Internal layers (order matters: _base must be first)
    './layers/_base',
    './layers/auth',
    './layers/user',
    './layers/landing',
    './layers/vacancy'
  ],

  devtools: {
    enabled: true
  },

  typescript: {
    strict: true,
    // Disable typeCheck in dev to avoid blocking on known NuxtUI v4 type issues
    // Run `pnpm typecheck` separately for type validation
    typeCheck: false
  },

  alias: { '@site': fileURLToPath(new URL('./', import.meta.url)) }
})
