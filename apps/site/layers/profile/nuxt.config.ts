import { fileURLToPath } from 'node:url';

export default defineNuxtConfig({
  compatibilityDate: '2026-01-22',

  alias: { '@site/profile': fileURLToPath(new URL('./', import.meta.url)) },
  components: [{ path: '@site/profile/app/components', prefix: 'Profile' }]
});
