import { fileURLToPath } from 'node:url';

export default defineNuxtConfig({
  compatibilityDate: '2026-01-22',

  alias: { '@site/vacancy': fileURLToPath(new URL('./', import.meta.url)) },
  components: [{ path: '@site/vacancy/components', prefix: 'Vacancy' }]
});
