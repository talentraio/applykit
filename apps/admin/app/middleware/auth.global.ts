/**
 * Admin Authentication Middleware
 *
 * Ensures only super_admin users can access admin pages.
 * Redirects to login for unauthenticated users.
 * Shows error for authenticated non-admin users.
 *
 * Related: US8 Admin Role Management
 */

export default defineNuxtRouteMiddleware(async to => {
  const { loggedIn, session, fetch } = useUserSession();

  // Public routes that don't require auth
  const publicRoutes = ['/login'];

  if (publicRoutes.includes(to.path)) {
    return;
  }

  // Fetch session if not loaded
  if (!loggedIn.value && !session.value) {
    try {
      await fetch();
    } catch {
      // Not authenticated - ignore fetch errors
    }
  }

  const user = session.value?.user;

  // Not authenticated - redirect to login
  if (!session.value || !user) {
    return navigateTo({
      path: '/login',
      query: {
        redirect: to.fullPath
      }
    });
  }

  // Authenticated but not super_admin - deny access
  if (user.role !== 'super_admin') {
    return abortNavigation({
      statusCode: 403,
      message: 'Access denied. Super admin role required.'
    });
  }

  // Super admin - allow access
});
