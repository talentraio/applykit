export default defineNuxtRouteMiddleware(to => {
  // Temporary redirect because dashboard page not ready
  if (to.path === '/dashboard' || to.path === '/dashboard/') {
    return navigateTo('/resume', { redirectCode: 301 });
  }
});
