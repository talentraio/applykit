/**
 * Auth modal URL sync middleware (client-side).
 *
 * Keeps programmatic overlay state in sync with `?auth=` query
 * on initial load and every client-side navigation.
 */
export default defineNuxtRouteMiddleware(to => {
  if (import.meta.server) {
    return;
  }

  const { syncAuthModalFromQuery } = useAuth();
  syncAuthModalFromQuery(to.query);
});
