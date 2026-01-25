import { fileURLToPath } from 'node:url';

export default defineNuxtConfig({
  compatibilityDate: '2026-01-22',

  alias: { '@admin/base': fileURLToPath(new URL('./', import.meta.url)) }
});
