/**
 * Resume index guard.
 *
 * For `/resume`, redirects users with existing resumes to the editor page
 * of the default resume (or the first available fallback).
 * If there are no resumes, allows rendering the upload/create page.
 */
export default defineNuxtRouteMiddleware(async to => {
  const normalizedPath = to.path.length > 1 ? to.path.replace(/\/+$/, '') : to.path;

  if (normalizedPath !== '/resume') {
    return;
  }

  const store = useResumeStore();

  try {
    const items = await store.fetchResumeList();

    if (items.length === 0) {
      return;
    }

    const defaultItem = items.find(item => item.isDefault);
    const targetId = defaultItem?.id ?? items[0]?.id;

    if (!targetId) {
      return;
    }

    return navigateTo(`/resume/${targetId}`, { replace: true });
  } catch {
    // Keep `/resume` available when list fetch fails.
  }
});
