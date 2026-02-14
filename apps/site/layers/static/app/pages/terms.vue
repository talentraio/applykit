<template>
  <div class="static-terms-page p-4 py-8">
    <UiPageHeader :title="$t('static.terms.title')" />

    <UPageCard class="mt-6">
      <div class="prose prose-neutral dark:prose-invert max-w-none">
        <p class="text-muted">
          Last updated: {{ cfg.termsLastUpdated || 'TBD' }}<br />
          Effective date: {{ cfg.termsEffectiveDate || 'TBD' }}
        </p>

        <h2>1. Who we are</h2>
        <p>
          These Terms govern access to and use of {{ cfg.serviceName || 'the Service' }} (the
          "Service", "we", "us", "our").
        </p>
        <p>
          Service operator (current stage):
          {{ cfg.operatorDescription || 'an individual developer' }} based in
          {{ cfg.operatorCountry || 'Denmark' }} (not yet incorporated as a legal entity).
        </p>
        <p>
          Contact:
          <a v-if="cfg.supportEmail" :href="`mailto:${cfg.supportEmail}`">
            {{ cfg.supportEmail }}
          </a>
          <span v-else class="text-muted italic">TBD</span>
        </p>
        <p>
          The Service may be accessible via a temporary deployment URL (for example, a *.vercel.app
          address) until a public domain is introduced.
        </p>

        <h2>2. Acceptance of Terms</h2>
        <p>
          By accessing or using the Service, you agree to these Terms. If you do not agree, do not
          use the Service.
        </p>
        <p>
          The Service may be provided as a demo/beta. Features may change, be unavailable, or be
          removed without prior notice.
        </p>

        <h2>3. The Service</h2>
        <p>
          The Service helps users draft, tailor, and format job-application materials (e.g.,
          resume/CV, cover letter) based on content provided by the user, including AI-assisted
          functionality.
        </p>

        <h2>4. Accounts and access</h2>
        <p>If the Service requires an account:</p>
        <ul>
          <li>You must provide accurate information and keep your access credentials secure.</li>
          <li>You are responsible for activity under your account unless caused by our fault.</li>
          <li>
            We may restrict or suspend access to protect the Service, prevent abuse, or comply with
            law.
          </li>
        </ul>

        <h2>5. Free access and usage limits</h2>
        <p>
          At this stage, the Service is free and subject to strict usage limits (e.g., daily quotas,
          feature caps, rate limits). Limits may change at any time to protect the Service and
          manage operational costs.
        </p>

        <h2>6. Your content and permissions</h2>
        <p>
          "User Content" includes any text or files you upload or enter (resume/CV, job
          descriptions, notes, generated drafts).
        </p>
        <p>
          You retain ownership of your User Content. You grant us a limited, non-exclusive license
          to process your User Content only to provide and maintain the Service (e.g., parsing,
          generating outputs, displaying, exporting, storing in your account if applicable, and
          addressing support/security issues).
        </p>
        <p>
          You represent that you have the rights and permissions necessary to upload and use your
          User Content.
        </p>

        <h2>7. AI/LLM outputs and disclaimers</h2>
        <p>
          The Service uses third-party AI/LLM providers (currently OpenAI and Google Gemini) to
          generate or rewrite text. Outputs may be inaccurate, incomplete, or inappropriate.
        </p>
        <p>
          You agree that you will review and verify outputs before using or sharing them. The
          Service is not legal, HR, tax, or immigration advice and does not guarantee any hiring
          outcome (interviews/offers) or ATS performance.
        </p>

        <h2>8. Prohibited use</h2>
        <p>You must not:</p>
        <ul>
          <li>violate applicable laws or third-party rights;</li>
          <li>upload malware or attempt to disrupt or compromise the Service;</li>
          <li>bypass limits, scrape the Service, reverse engineer, or resell access;</li>
          <li>
            use the Service to create or distribute unlawful, harmful, or discriminatory content.
          </li>
        </ul>

        <h2>9. Availability and changes</h2>
        <p>
          We may modify, update, suspend, or discontinue parts of the Service (including limits and
          features) at any time.
        </p>

        <h2>10. No warranties</h2>
        <p>
          The Service is provided "as is" and "as available". To the maximum extent permitted by
          law, we disclaim all warranties (including merchantability, fitness for a particular
          purpose, and non-infringement).
        </p>

        <h2>11. Limitation of liability</h2>
        <p>To the maximum extent permitted by law:</p>
        <ul>
          <li>
            We are not liable for indirect, incidental, special, consequential, or punitive damages
            (including lost profits, lost opportunities, or reputational harm).
          </li>
          <li>
            For a free demo service, our total liability is limited to EUR&nbsp;0, except where
            liability cannot be excluded or limited by mandatory law.
          </li>
        </ul>

        <h2>12. Account deletion</h2>
        <p>
          You can delete your account via the user settings page (if available). When you delete
          your account:
        </p>
        <ul>
          <li>we delete or de-identify your saved content where feasible; and</li>
          <li>we remove access and sanitize the account record.</li>
        </ul>
        <p>For anti-abuse and security, we may retain:</p>
        <ul>
          <li>a minimal "tombstone" record (e.g., user ID and deletion timestamp), and</li>
          <li>
            a pseudonymous suppression fingerprint derived from your email (e.g., an HMAC hash) to
            prevent repeated sign-ups/abuse.
          </li>
        </ul>
        <p>
          This suppression fingerprint is retained for a limited period ({{
            cfg.suppressionTtlDays
          }}
          days) and then automatically removed, as described in the
          <NuxtLink to="/privacy">Privacy Policy</NuxtLink>.
        </p>

        <h2>13. Governing law</h2>
        <p>
          These Terms are governed by the laws of {{ cfg.operatorCountry || 'Denmark' }}, without
          prejudice to any mandatory consumer protections that may apply in your country of
          residence within the EU/EEA.
        </p>

        <h2>14. Contact</h2>
        <p>
          Questions about these Terms:
          <a v-if="cfg.supportEmail" :href="`mailto:${cfg.supportEmail}`">
            {{ cfg.supportEmail }}
          </a>
          <span v-else class="text-muted italic">TBD</span>
        </p>
      </div>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
/**
 * Terms and Conditions Page
 *
 * Static page with terms and conditions content.
 * Dynamic values (service name, email, dates) come from runtimeConfig.public.contentConfig.
 */

defineOptions({ name: 'StaticTermsPage' });

definePageMeta({
  layout: 'static'
});

const cfg = useRuntimeConfig().public.contentConfig;
</script>

<style lang="scss">
.static-terms-page {
  .prose {
    h2 {
      margin-top: 2rem;
      font-size: 1.25rem;
      font-weight: 600;

      &:first-of-type {
        margin-top: 1rem;
      }
    }

    p {
      margin: 1rem 0;
      line-height: 1.625;
    }

    ul {
      margin: 1rem 0;
      padding-left: 1.5rem;
      list-style-type: disc;

      > li + li {
        margin-top: 0.75rem;
      }
    }
  }
}
</style>
