/**
 * Site-specific API error handler configuration.
 *
 * Feature: 016-errors-handling
 * App: apps/site/
 *
 * Creates the `onResponseError` callback for site `useApi()`.
 * Uses `createApiErrorHandler` factory from `@int/api` layer.
 */

/**
 * Module-scope flag to prevent concurrent 401/403 redirect loops.
 * Shared across all `useApi()` calls within the site app.
 */
let isRedirecting = false;

/**
 * Creates the site-specific error handler.
 * Must be called inside a Nuxt composable context (needs useRouter, useI18n, etc.).
 *
 * `createApiErrorHandler` and `ApiError` come from @int/api layer.
 * `useApiErrorToast` is local to site app.
 * Callback parameter types are inferred from ApiErrorHandlerConfig.
 */
export const useSiteErrorHandler = () => {
  const showToast = (error: ApiError): void => {
    if (import.meta.server) {
      return;
    }

    const { showErrorToast } = useApiErrorToast();
    showErrorToast(error);
  };

  return createApiErrorHandler({
    async onUnauthorized(_error) {
      if (isRedirecting) return;
      isRedirecting = true;

      try {
        const { clear } = useUserSession();
        const authStore = useAuthStore();
        const router = useRouter();
        const route = router.currentRoute.value;

        // Clear session and store data
        try {
          await clear();
        } catch {
          // Ignore session clear errors
        }
        authStore.resetUserStores();

        // Redirect to login with return path
        if (route.path !== '/login') {
          await navigateTo({
            path: '/login',
            query: {
              error: 'session_expired',
              redirect: route.fullPath
            }
          });
        }
      } finally {
        isRedirecting = false;
      }
    },

    async onForbidden(_error, code) {
      if (isRedirecting) return;

      switch (code) {
        case 'USER_DELETED':
        case 'USER_BLOCKED': {
          isRedirecting = true;
          try {
            const { clear } = useUserSession();
            const authStore = useAuthStore();
            const router = useRouter();
            const route = router.currentRoute.value;

            try {
              await clear();
            } catch {
              // Ignore session clear errors
            }
            authStore.resetUserStores();

            if (route.path !== '/login') {
              await navigateTo({
                path: '/login',
                query: { error: 'forbidden', redirect: route.fullPath }
              });
            }
          } finally {
            isRedirecting = false;
          }
          break;
        }

        case 'PROFILE_INCOMPLETE':
          // Handled by profile gate flow, no global toast needed
          break;

        case 'ACCESS_DENIED':
        default:
          showToast(_error);
          break;
      }
    },

    onNotification(error) {
      showToast(error);
    }
  });
};
