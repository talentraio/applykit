import type { EmailVerificationFlow } from '../../utils/email-verification-flow';
import { Resend } from 'resend';
import { EMAIL_VERIFICATION_FLOW_MAP } from '../../utils/email-verification-flow';
import { getPasswordResetTemplate } from './templates/password-reset';
import { getVerificationTemplate } from './templates/verification';

/**
 * Email Service
 *
 * Handles sending transactional emails using Resend.
 * Falls back to console logging in development when API key is not set.
 *
 * Feature: 003-auth-expansion
 */

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (resendClient) return resendClient;

  const config = useRuntimeConfig();
  const apiKey = config.email?.resendApiKey;

  if (!apiKey) {
    console.warn('[Email] Resend API key not configured. Emails will be logged to console.');
    return null;
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

function getFromAddress(): string {
  const config = useRuntimeConfig();
  return config.email?.from ?? 'ApplyKit <noreply@applykit.com>';
}

function getAppUrl(): string {
  const config = useRuntimeConfig();
  return config.public?.appUrl ?? 'http://localhost:3000';
}

function getSiteUrl(): string {
  const config = useRuntimeConfig();
  const configuredSiteUrl = config.public?.siteUrl;

  if (typeof configuredSiteUrl === 'string' && configuredSiteUrl.length > 0) {
    return configuredSiteUrl;
  }

  return getAppUrl();
}

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Send an email using Resend
 * Falls back to console logging if Resend is not configured
 */
async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const client = getResendClient();

  if (!client) {
    console.warn(
      `[Email] Resend not configured. Would send email to: ${options.to}, subject: ${options.subject}`
    );
    return true;
  }

  try {
    const result = await client.emails.send({
      from: getFromAddress(),
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    });

    if (result.error) {
      console.error('[Email] Failed to send email:', result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Email] Error sending email:', error);
    return false;
  }
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  firstName: string,
  token: string,
  flow: EmailVerificationFlow = EMAIL_VERIFICATION_FLOW_MAP.VERIFICATION
): Promise<boolean> {
  const verifyBaseUrl = flow === EMAIL_VERIFICATION_FLOW_MAP.INVITE ? getSiteUrl() : getAppUrl();
  const verifyUrl = new URL('/api/auth/verify-email', verifyBaseUrl);
  verifyUrl.searchParams.set('token', token);
  verifyUrl.searchParams.set('flow', flow);

  const template = getVerificationTemplate({
    firstName,
    verifyUrl: verifyUrl.toString(),
    flow,
    siteUrl: getSiteUrl()
  });

  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  token: string
): Promise<boolean> {
  const appUrl = getAppUrl();
  const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;

  const template = getPasswordResetTemplate(firstName, resetUrl);

  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}
