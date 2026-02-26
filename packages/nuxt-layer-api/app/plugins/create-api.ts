/**
 * create-api plugin — sets up the shared `$api` instance.
 *
 * Handles transport-only concerns:
 * - SSR header forwarding (cookie, host, x-forwarded-*)
 * - Credentials + timeout configuration
 *
 * Error handling is NOT here — it's in per-app `useApi()` overrides
 * (site: apps/site/layers/_base/app/composables/useApi.ts)
 * (admin: apps/admin/layers/_base/app/composables/useApi.ts)
 *
 * Feature: 016-errors-handling (moved onResponseError to per-app handlers)
 */
export default defineNuxtPlugin({
  name: 'create-api',
  enforce: 'pre',
  async setup(_nuxtApp) {
    const { apiCallTimeoutMs } = _nuxtApp.$config.public;

    const api = $fetch.create({
      credentials: 'include',
      timeout: typeof apiCallTimeoutMs === 'number' ? apiCallTimeoutMs : 30000,

      // SSR header forwarding
      async onRequest({ options }) {
        if (import.meta.server) {
          const clientHeaders = useRequestHeaders([
            'cookie',
            'accept-language',
            'user-agent',
            'host',
            'x-forwarded-host',
            'x-forwarded-proto',
            'x-forwarded-port'
          ]);

          options.headers = {
            ...options.headers,
            ...clientHeaders,
            // @ts-expect-error accept does not exist in type Headers
            accept: 'application/json',
            'x-on-server-call': 'true'
          };
        }
      }
    });

    _nuxtApp.provide('api', api);
  }
});
