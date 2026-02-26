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

  // Public routes that must stay accessible without authentication.
  // `/login` remains as a compatibility alias and redirects to `/?auth=login`.
  const publicRoutes = new Set<string>([
    redirects.protected.unauthenticated,
    '/',
    '/auth/reset-password',
    '/privacy',
    '/terms'
  ]);
  const token = typeof to.query.token === 'string' ? to.query.token : '';
  const isPdfPreview = to.path === '/pdf/preview' && Boolean(token);
  const isCoverLetterPdfPreview = to.path === '/cover-letter/pdf/preview' && Boolean(token);

  if (publicRoutes.has(to.path) || isPdfPreview || isCoverLetterPdfPreview) {
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
