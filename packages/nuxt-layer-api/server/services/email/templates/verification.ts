/**
 * Email Verification Template
 *
 * Feature: 003-auth-expansion
 */

import type { EmailVerificationFlow } from '../../../utils/email-verification-flow';
import { EMAIL_VERIFICATION_FLOW_MAP } from '../../../utils/email-verification-flow';

export type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

export type VerificationTemplateInput = {
  firstName: string;
  verifyUrl: string;
  flow?: EmailVerificationFlow;
  siteUrl: string;
};

const normalizeSiteUrl = (value: string): string => {
  try {
    const parsed = new URL(value);
    return parsed.origin;
  } catch {
    return value;
  }
};

export function getVerificationTemplate(input: VerificationTemplateInput): EmailTemplate {
  const flow = input.flow ?? EMAIL_VERIFICATION_FLOW_MAP.VERIFICATION;
  const siteUrl = normalizeSiteUrl(input.siteUrl);
  const isInviteFlow = flow === EMAIL_VERIFICATION_FLOW_MAP.INVITE;

  const subject = isInviteFlow ? "You're invited to join ApplyKit" : 'Verify your ApplyKit email';
  const heading = isInviteFlow ? "You're invited" : 'Verify your email';
  const actionLabel = isInviteFlow ? 'Accept Invitation' : 'Verify Email';
  const intro = isInviteFlow
    ? `You have been invited to register on ${siteUrl}. Click the button below to get started:`
    : 'Please verify your email address by clicking the button below:';
  const footer = isInviteFlow
    ? "If you weren't expecting this invitation, you can safely ignore this email."
    : "If you didn't create an account on ApplyKit, you can safely ignore this email.";
  const expiryLine = isInviteFlow
    ? ''
    : '<p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">This link expires in 24 hours.</p>';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f9fafb; border-radius: 8px; padding: 32px;">
    <h1 style="color: #111827; font-size: 24px; margin: 0 0 24px 0;">${heading}</h1>

    <p style="margin: 0 0 16px 0;">Hi ${input.firstName},</p>

    <p style="margin: 0 0 24px 0;">${intro}</p>

    <a href="${input.verifyUrl}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">${actionLabel}</a>

    ${expiryLine}
    <p style="margin: 16px 0 0 0; font-size: 14px; color: #6b7280;">${footer}</p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${input.verifyUrl}" style="color: #2563eb; word-break: break-all;">${input.verifyUrl}</a>
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Hi ${input.firstName},

${intro}

${input.verifyUrl}

${isInviteFlow ? '' : 'This link expires in 24 hours.'}

${footer}
  `.trim();

  return { subject, html, text };
}
