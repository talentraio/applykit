export default defineNuxtPlugin({
  name: 'create-api',
  enforce: 'pre',
  async setup(_nuxtApp) {
    const { apiCallTimeoutMs } = _nuxtApp.$config.public;

    const api = $fetch.create({
      credentials: 'include',
      timeout: typeof apiCallTimeoutMs === 'number' ? apiCallTimeoutMs : 30000,

      // Interceptors
      async onRequest({ options }) {
        if (import.meta.server) {
          const clientHeaders = useRequestHeaders(['cookie', 'accept-language', 'user-agent']);

          options.headers = {
            ...options.headers,
            ...clientHeaders,
            // @ts-expect-error accept does not exist in type Headers
            accept: 'application/json',
            'x-on-server-call': 'true'
          };
        }
      },

      async onResponse() {
        // For future features
      }
    });

    _nuxtApp.provide('api', api);
  }
});
