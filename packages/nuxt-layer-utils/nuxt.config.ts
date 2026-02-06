import { fileURLToPath } from 'node:url';

export default defineNuxtConfig({
  compatibilityDate: '2026-01-22',

  typescript: {
    strict: true,
    typeCheck: false
  },

  alias: { '@layer/utils': fileURLToPath(new URL('./', import.meta.url)) }
});
