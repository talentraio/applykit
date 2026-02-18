/**
 * Auth Guard Middleware (Global)
 *
 * Protects routes that require authentication
 * Redirects unauthenticated users to /login
 *
 * T067 [US1] Auth guard middleware
 */

export default defineNuxtRouteMiddleware(to => {
  const { redirects } = useAppConfig();

  // Skip middleware for auth-related routes
  const publicRoutes = [redirects.protected.unauthenticated, '/'];
  const token = typeof to.query.token === 'string' ? to.query.token : '';
  const isPdfPreview = to.path === '/pdf/preview' && Boolean(token);

  if (publicRoutes.includes(to.path) || isPdfPreview) {
    return;
  }

  // Check authentication status
  const { loggedIn } = useUserSession();

  // Redirect to login if not authenticated
  if (!loggedIn.value) {
    return navigateTo({
      path: redirects.protected.unauthenticated,
      query: {
        redirect: to.fullPath
      }
    });
  }
});
