<template>
  <div class="static-privacy-page p-4 py-8">
    <UiPageHeader :title="$t('static.privacy.title')" />

    <UPageCard class="mt-6">
      <div class="prose prose-neutral dark:prose-invert max-w-none">
        <p class="text-muted">
          Last updated: {{ cfg.privacyLastUpdated || 'TBD' }}<br />
          Effective date: {{ cfg.privacyEffectiveDate || 'TBD' }}
        </p>

        <p>
          This Privacy Policy explains how {{ cfg.serviceName || 'the Service' }} (the "Service")
          processes personal data when you use it, in accordance with the GDPR and applicable EU/EEA
          laws.
        </p>

        <h2>1. Data controller</h2>
        <p>
          Controller: {{ cfg.operatorDescription || 'an individual developer' }} based in
          {{ cfg.operatorCountry || 'Denmark' }} (not yet incorporated as a legal entity).
        </p>
        <p>
          Contact for privacy requests:
          <a v-if="cfg.supportEmail" :href="`mailto:${cfg.supportEmail}`">
            {{ cfg.supportEmail }}
          </a>
          <span v-else class="text-muted italic">TBD</span>
        </p>

        <h2>2. Personal data we process</h2>

        <h3>2.1 Account and authentication data (while your account is active)</h3>
        <ul>
          <li>User ID</li>
          <li>Email address</li>
          <li>OAuth identifiers (e.g., Google ID, LinkedIn ID) if you use OAuth</li>
          <li>Password hash (if email/password login is enabled)</li>
          <li>
            Email verification and password reset tokens and their expiry timestamps (if applicable)
          </li>
          <li>Account role and status</li>
          <li>Timestamps (created/updated/last login)</li>
        </ul>

        <h3>2.2 User Content (while you use the Service)</h3>
        <ul>
          <li>Resume/CV content you upload or enter (DOCX/PDF and/or structured representation)</li>
          <li>Job descriptions, vacancy links, and notes you provide</li>
          <li>
            Generated outputs (tailored resumes, drafts, scoring results) if you choose to save them
            in the Service
          </li>
        </ul>

        <h3>2.3 Technical and security data</h3>
        <ul>
          <li>Session identifiers (cookie-based sessions)</li>
          <li>
            Basic request/security logs necessary for operation, troubleshooting, and abuse
            prevention (which may include IP address, timestamps, and device/browser information)
          </li>
        </ul>

        <h2>3. Cookies</h2>
        <p>
          At this stage we use only essential session cookies required for authentication, session
          management, and security.
        </p>
        <p>We do not use analytics or advertising cookies currently.</p>

        <h2>4. Why we process data (purposes) and legal bases</h2>
        <p>We process personal data for:</p>
        <ul>
          <li>
            <strong>Providing the Service</strong>
            (account access, storing and displaying your data, generating and exporting
            documents)<br />
            Legal basis: performance of a contract (GDPR Art.&nbsp;6(1)(b))
          </li>
          <li>
            <strong>Security, abuse prevention, troubleshooting, enforcing limits</strong><br />
            Legal basis: legitimate interests (GDPR Art.&nbsp;6(1)(f))
          </li>
          <li>
            <strong>Service communications</strong> (verification emails, password resets, important
            account notices)<br />
            Legal basis: performance of a contract (Art.&nbsp;6(1)(b)) and/or legitimate interests
            (Art.&nbsp;6(1)(f))
          </li>
          <li>
            <strong>Legal compliance</strong> (if applicable)<br />
            Legal basis: legal obligation (GDPR Art.&nbsp;6(1)(c))
          </li>
        </ul>

        <h2>5. AI/LLM processing (OpenAI + Google Gemini)</h2>
        <p>
          Some features send relevant parts of your input (e.g., resume/job description text) to
          third-party AI/LLM providers to produce outputs. We send only what is necessary to process
          your request.
        </p>
        <p>Providers currently used: OpenAI and Google Gemini.</p>
        <p>
          No BYOK: you do not provide your own API keys at this stage; provider access is managed
          server-side.
        </p>

        <h2>6. Sharing data with processors (service providers)</h2>
        <p>We use third-party providers to operate the Service, such as:</p>
        <ul>
          <li><strong>Hosting/infrastructure:</strong> Vercel</li>
          <li><strong>AI/LLM providers:</strong> OpenAI and Google Gemini</li>
          <li>
            <strong>Email delivery (if enabled):</strong>
            {{ cfg.emailDeliveryProvider || 'TBD' }}
          </li>
        </ul>
        <p>
          We share personal data only as needed to provide the Service and require processors to
          protect it under applicable agreements (e.g., data processing terms).
        </p>

        <h2>7. International data transfers</h2>
        <p>
          Some providers may process data outside the EU/EEA. Where required, we rely on lawful
          transfer mechanisms (e.g., adequacy decisions and/or Standard Contractual Clauses) and
          additional safeguards as appropriate.
        </p>

        <h2>8. Data retention</h2>
        <p>We keep personal data only as long as necessary for the purposes described above.</p>
        <ul>
          <li>
            <strong>Active account:</strong> we keep your account data and saved content while your
            account is active.
          </li>
          <li>
            <strong>Deleted account (content &amp; identifiers):</strong> when you delete your
            account, we delete or de-identify your saved content where feasible and sanitize the
            user record (for example, removing email/OAuth identifiers and any auth tokens).
          </li>
          <li>
            <strong>Deleted account (anti-abuse suppression):</strong> for security and abuse
            prevention, we retain a pseudonymous suppression record derived from your email (e.g.,
            an HMAC hash), plus minimal metadata such as created_at, expires_at, and a reason code.
            This record is retained for a limited period ({{ cfg.suppressionTtlDays }} days) and
            then automatically deleted.
          </li>
          <li>
            <strong>Minimal tombstone:</strong> we may retain a minimal "tombstone" record (e.g.,
            user ID and deletedAt) to support auditability and system integrity.
          </li>
          <li>
            <strong>Security logs:</strong> retained for a limited period ({{
              cfg.securityLogRetentionDays
            }}
            days) and only as needed for security and troubleshooting.
          </li>
          <li>
            <strong>Backups:</strong> may persist for a limited period (up to
            {{ cfg.backupRetentionDays }} days) before being overwritten.
          </li>
        </ul>

        <h2>9. Security</h2>
        <p>
          We apply reasonable technical and organizational measures (access controls, encryption in
          transit, secure session cookies, restricted access to secrets). No system can guarantee
          absolute security.
        </p>

        <h2>10. Your GDPR rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>access your data</li>
          <li>correct inaccurate data</li>
          <li>request deletion (subject to lawful retention for security/abuse prevention)</li>
          <li>
            restrict or object to certain processing (including processing based on legitimate
            interests)
          </li>
          <li>data portability (where applicable)</li>
          <li>withdraw consent (where processing is based on consent)</li>
        </ul>
        <p>
          To exercise your rights, email
          <a v-if="cfg.supportEmail" :href="`mailto:${cfg.supportEmail}?subject=GDPR%20Request`">
            {{ cfg.supportEmail }}
          </a>
          <span v-else class="text-muted italic">TBD</span>
          with subject "GDPR Request". We may ask for verification to protect your data.
        </p>
        <p>
          You also have the right to lodge a complaint with a supervisory authority. In Denmark, the
          authority is the Danish Data Protection Agency (Datatilsynet).
        </p>

        <h2>11. Children</h2>
        <p>
          The Service is not intended for individuals under 16 (or the applicable digital consent
          age in your jurisdiction). We do not knowingly collect data from children.
        </p>

        <h2>12. Changes to this Policy</h2>
        <p>
          We may update this Policy as the Service evolves (e.g., if analytics are added). The
          updated version will be published with a new "Last updated" date.
        </p>
      </div>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
/**
 * Privacy Policy Page
 *
 * Static page with GDPR-compliant privacy policy content.
 * Dynamic values come from runtimeConfig.public.contentConfig.
 */

defineOptions({ name: 'StaticPrivacyPage' });

definePageMeta({
  layout: 'static'
});

const cfg = useRuntimeConfig().public.contentConfig;
</script>

<style lang="scss">
.static-privacy-page {
  .prose {
    h2 {
      margin-top: 2rem;
      font-size: 1.25rem;
      font-weight: 600;

      &:first-of-type {
        margin-top: 1rem;
      }
    }

    h3 {
      margin-top: 1.5rem;
      font-size: 1.125rem;
      font-weight: 500;
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
