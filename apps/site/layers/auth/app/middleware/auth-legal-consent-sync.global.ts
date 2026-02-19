/**
 * Sync legal-consent modal state with auth store state on route changes.
 */
export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) {
    return;
  }

  const { syncLegalConsentModal } = useAuth();
  syncLegalConsentModal();
});
