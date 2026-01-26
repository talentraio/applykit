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
  const { session, fetch } = useUserSession();

  // Public routes that don't require auth
  const publicRoutes = ['/login'];

  if (publicRoutes.includes(to.path)) {
    return;
  }

  // Fetch session if not loaded
  if (!session.value) {
    await fetch();
  }

  // Not authenticated - redirect to login
  if (!session.value) {
    return navigateTo('/login');
  }

  // Authenticated but not super_admin - deny access
  if (session.value.user.role !== 'super_admin') {
    return abortNavigation({
      statusCode: 403,
      message: 'Access denied. Super admin role required.'
    });
  }

  // Super admin - allow access
});
