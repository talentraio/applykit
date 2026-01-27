import { fileURLToPath } from 'node:url';

export default defineNuxtConfig({
  compatibilityDate: '2026-01-22',

  alias: { '@admin/users': fileURLToPath(new URL('./', import.meta.url)) },
  components: [{ path: '@admin/users/app/components', prefix: 'Users' }]
});
