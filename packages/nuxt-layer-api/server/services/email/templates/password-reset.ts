/**
 * Password Reset Email Template
 *
 * Feature: 003-auth-expansion
 */

export type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

export function getPasswordResetTemplate(firstName: string, resetUrl: string): EmailTemplate {
  const subject = 'Reset your ApplyKit password';

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
    <h1 style="color: #111827; font-size: 24px; margin: 0 0 24px 0;">Reset your password</h1>

    <p style="margin: 0 0 16px 0;">Hi ${firstName},</p>

    <p style="margin: 0 0 24px 0;">We received a request to reset your password. Click the button below to choose a new password:</p>

    <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Reset Password</a>

    <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">This link expires in 1 hour.</p>

    <p style="margin: 16px 0 0 0; font-size: 14px; color: #6b7280;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Hi ${firstName},

We received a request to reset your password. Visit the link below to choose a new password:

${resetUrl}

This link expires in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
  `.trim();

  return { subject, html, text };
}
