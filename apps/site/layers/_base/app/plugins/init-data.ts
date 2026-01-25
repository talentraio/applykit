import { useApiAuthStore } from '@layer/api/app/stores/auth';

/**
 * SSR Data Initialization Plugin
 *
 * Runs on server before rendering to warm up essential data:
 * - User session and profile (if authenticated)
 * - Global dictionaries (future: countries, etc.)
 *
 * TR011 - Created as part of architecture refactoring
 * See: docs/codestyle/pinia.md for store-init pattern
 */

export default defineNuxtPlugin({
  name: 'init-data',
  enforce: 'pre',
  parallel: false,
  dependsOn: ['pinia'],

  async setup() {
    const authStore = useApiAuthStore();

    await callOnce('UserData', async () => {
      // Skip if already initialized (e.g., during client-side navigation)
      if (authStore.initialized) {
        return;
      }

      // Try to load user session
      // This will fail silently if not authenticated
      try {
        await authStore.fetchMe();
      } catch {
        // Not authenticated - this is expected for public pages
        // Store is already initialized with null values

        return true;
      }
    });

    // Future: Load global dictionaries here
    // const dictStore = useDictionaryStore()
    // await dictStore.loadCountries()
  }
});
