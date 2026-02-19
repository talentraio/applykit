/**
 * Redirect resolver for the post-login route.
 *
 * Replaces dedicated `/auth/post-login` page logic with route middleware.
 * It resolves the destination based on whether user already has vacancies.
 */
export default defineNuxtRouteMiddleware(async to => {
  const { redirects } = useAppConfig();
  const resolverPath = redirects.postLogin.resolver;

  if (to.path !== resolverPath) {
    return;
  }

  const { loggedIn } = useUserSession();
  if (!loggedIn.value) {
    return;
  }

  const vacancyStore = useVacancyStore();

  try {
    const response = await vacancyStore.fetchVacanciesPaginated({ currentPage: 1, pageSize: 1 });
    const target =
      response.pagination.totalItems > 0
        ? redirects.postLogin.hasVacancies
        : redirects.postLogin.noVacancies;

    if (target === resolverPath) {
      return;
    }

    return navigateTo(target, { replace: true });
  } catch {
    const fallback = redirects.postLogin.fallback;
    if (fallback === resolverPath) {
      return;
    }

    return navigateTo(fallback, { replace: true });
  }
});
