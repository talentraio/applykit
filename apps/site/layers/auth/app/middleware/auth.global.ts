/**
 * Auth Guard Middleware (Global)
 *
 * Protects routes that require authentication
 * Redirects unauthenticated users to /login
 *
 * T067 [US1] Auth guard middleware
 */

export default defineNuxtRouteMiddleware(to => {
  // Skip middleware for auth-related routes
  const publicRoutes = ['/login', '/'];
  if (publicRoutes.includes(to.path)) {
    return;
  }

  // Check authentication status
  const { loggedIn } = useUserSession();

  // Redirect to login if not authenticated
  if (!loggedIn.value) {
    return navigateTo({
      path: '/login',
      query: {
        redirect: to.fullPath
      }
    });
  }
});
