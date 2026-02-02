/**
 * Resume Redirect Middleware
 *
 * Redirects legacy /resumes/* routes to the new /resume page.
 *
 * Related: T040 (US3)
 */

export default defineNuxtRouteMiddleware(to => {
  // Redirect /resumes to /resume
  if (to.path === '/resumes' || to.path === '/resumes/') {
    return navigateTo('/resume', { redirectCode: 301 });
  }

  // Redirect /resumes/new to /resume
  if (to.path === '/resumes/new') {
    return navigateTo('/resume', { redirectCode: 301 });
  }

  // Redirect /resumes/:id to /resume (single resume architecture)
  if (to.path.startsWith('/resumes/') && to.path !== '/resumes/') {
    return navigateTo('/resume', { redirectCode: 301 });
  }
});
