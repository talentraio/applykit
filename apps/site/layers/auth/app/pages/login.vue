<template>
  <div class="auth-login-page flex min-h-screen flex-col items-center justify-center p-4">
    <p class="text-muted">Redirecting...</p>
  </div>
</template>

<script setup lang="ts">
/**
 * Login Page - Redirect to Modal
 *
 * This page now redirects to the home page with the auth modal open.
 * The actual login UI is in the AuthModal component.
 *
 * Feature: 003-auth-expansion
 */
defineOptions({ name: 'AuthLoginPage' });

const route = useRoute();

definePageMeta({
  layout: 'auth'
});

// Redirect to home with auth modal
onMounted(() => {
  const error = route.query.error;
  const redirect = route.query.redirect;

  // Build redirect URL with auth modal
  let url = '/?auth=login';
  if (error) {
    url += `&error=${error}`;
  }
  if (redirect && typeof redirect === 'string') {
    url += `&redirect=${encodeURIComponent(redirect)}`;
  }

  navigateTo(url, { replace: true });
});
</script>
