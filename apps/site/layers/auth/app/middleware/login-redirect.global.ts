/**
 * Login alias middleware.
 *
 * Keeps `/login` as a compatibility entry point and redirects it
 * to the modal-based auth flow on the landing page.
 */
export default defineNuxtRouteMiddleware(to => {
  if (to.path !== '/login') {
    return;
  }

  const error = typeof to.query.error === 'string' ? to.query.error : undefined;
  const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : undefined;

  return navigateTo(
    {
      path: '/',
      query: {
        auth: 'login',
        ...(error ? { error } : {}),
        ...(redirect ? { redirect } : {})
      }
    },
    { replace: true }
  );
});
