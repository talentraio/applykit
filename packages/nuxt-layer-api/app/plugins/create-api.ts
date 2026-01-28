export default defineNuxtPlugin({
  name: 'create-api',
  enforce: 'pre',
  async setup(_nuxtApp) {
    const { apiCallTimeoutMs } = _nuxtApp.$config.public;
    let isRedirecting = false;

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
      },

      async onResponseError({ response }) {
        if (!import.meta.client || isRedirecting) return;
        if (response?.status !== 403) return;

        isRedirecting = true;

        try {
          const router = useRouter();
          const route = router.currentRoute.value;
          const { clear } = useUserSession();

          try {
            await clear();
          } catch {
            // Ignore session clear errors
          }

          if (route.path !== '/login') {
            await navigateTo({
              path: '/login',
              query: {
                error: 'forbidden',
                redirect: route.fullPath
              }
            });
          }
        } finally {
          isRedirecting = false;
        }
      }
    });

    _nuxtApp.provide('api', api);
  }
});
