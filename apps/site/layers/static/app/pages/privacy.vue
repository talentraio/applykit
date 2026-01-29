<template>
  <div class="static-privacy-page container mx-auto max-w-4xl p-4 py-8">
    <UiPageHeader :title="$t('static.privacy.title')" />

    <UPageCard class="mt-6">
      <div class="prose prose-neutral dark:prose-invert max-w-none">
        <p class="text-muted">
          {{ $t('static.privacy.lastUpdated', { date: lastUpdatedDate }) }}
        </p>

        <h2>1. Information We Collect</h2>
        <p>
          We collect information you provide directly to us, including your name, email address, and
          resume data when you use our service.
        </p>

        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, maintain, and improve our services</li>
          <li>Process and parse your resume documents</li>
          <li>Generate tailored resumes for job applications</li>
          <li>Send you technical notices and support messages</li>
        </ul>

        <h2>3. Data Storage and Security</h2>
        <p>
          Your data is stored securely using industry-standard encryption. We retain your resume
          data for as long as your account is active or as needed to provide you services.
        </p>

        <h2>4. Third-Party Services</h2>
        <p>
          We may use third-party AI services for resume parsing and generation. When you use your
          own API keys, your data is processed directly with those providers under their respective
          privacy policies.
        </p>

        <h2>5. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Request correction of your data</li>
          <li>Request deletion of your account and data</li>
          <li>Export your data</li>
        </ul>

        <h2>6. Cookies</h2>
        <p>
          We use essential cookies for authentication and session management. We do not use
          third-party tracking cookies.
        </p>

        <h2>7. Changes to This Policy</h2>
        <p>
          We may update this privacy policy from time to time. We will notify you of any changes by
          posting the new policy on this page.
        </p>

        <h2>8. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us through the support
          channels provided in the application.
        </p>
      </div>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
/**
 * Privacy Policy Page
 *
 * Static page with privacy policy content
 */

defineOptions({ name: 'StaticPrivacyPage' });

definePageMeta({
  layout: 'default'
});

const lastUpdatedDate = 'January 2026';
</script>

<style lang="scss">
.static-privacy-page {
  .prose {
    h2 {
      @apply mt-8 text-xl font-semibold;

      &:first-of-type {
        @apply mt-4;
      }
    }

    p {
      @apply my-4 leading-relaxed;
    }

    ul {
      @apply my-4 list-disc space-y-2 pl-6;
    }
  }
}
</style>
