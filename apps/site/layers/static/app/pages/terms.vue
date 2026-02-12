<template>
  <div class="static-terms-page p-4 py-8">
    <UiPageHeader :title="$t('static.terms.title')" />

    <UPageCard class="mt-6">
      <div class="prose prose-neutral dark:prose-invert max-w-none">
        <p class="text-muted">
          {{ $t('static.terms.lastUpdated', { date: lastUpdatedDate }) }}
        </p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using ApplyKit, you accept and agree to be bound by the terms and
          provisions of this agreement.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          ApplyKit provides resume parsing, tailoring, and export services. We help you create
          optimized resumes for job applications using AI-powered tools.
        </p>

        <h2>3. User Responsibilities</h2>
        <p>As a user, you agree to:</p>
        <ul>
          <li>Provide accurate information in your profile and resumes</li>
          <li>Use the service for legitimate job application purposes only</li>
          <li>Not upload malicious files or content</li>
          <li>Maintain the confidentiality of your account credentials</li>
        </ul>

        <h2>4. Intellectual Property</h2>
        <p>
          You retain ownership of your resume content. By using our service, you grant us a limited
          license to process your documents for the purpose of providing our services.
        </p>

        <h2>5. AI Provider Usage</h2>
        <p>
          ApplyKit uses platform-managed AI provider integrations to deliver parsing and generation
          features. You are responsible for compliant use of generated output.
        </p>

        <h2>6. Service Availability</h2>
        <p>
          We strive to maintain high availability but do not guarantee uninterrupted access. We may
          perform maintenance or updates that temporarily affect service availability.
        </p>

        <h2>7. Limitation of Liability</h2>
        <p>
          ApplyKit is provided "as is" without warranties. We are not responsible for the outcome of
          job applications made using our service.
        </p>

        <h2>8. Account Termination</h2>
        <p>
          You may delete your account at any time. We reserve the right to terminate accounts that
          violate these terms.
        </p>

        <h2>9. Changes to Terms</h2>
        <p>
          We may modify these terms at any time. Continued use of the service after changes
          constitutes acceptance of the new terms.
        </p>

        <h2>10. Contact</h2>
        <p>
          For questions about these Terms of Service, please contact us through the support channels
          provided in the application.
        </p>
      </div>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
/**
 * Terms of Service Page
 *
 * Static page with terms of service content
 */

defineOptions({ name: 'StaticTermsPage' });

definePageMeta({
  layout: 'default'
});

const lastUpdatedDate = 'January 2026';
</script>

<style lang="scss">
.static-terms-page {
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
