import { fileURLToPath } from 'node:url';

export default defineNuxtConfig({
  compatibilityDate: '2026-01-22',

  alias: { '@admin/llm': fileURLToPath(new URL('./', import.meta.url)) },
  components: [{ path: '@admin/llm/app/components', prefix: 'Llm' }]
});
