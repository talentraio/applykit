import { createHmac } from 'node:crypto';

/**
 * Compute HMAC-SHA256 hex digest of a normalized email.
 * Used to create a one-way fingerprint for the suppression table.
 *
 * - Normalizes: trim + lowercase
 * - Never logs input or output
 */
export function computeEmailHmac(email: string): string {
  const config = useRuntimeConfig();
  const pepper = String(config.suppressionPepper ?? '');

  if (!pepper) {
    throw new Error('suppressionPepper is not configured');
  }

  const normalized = email.trim().toLowerCase();
  return createHmac('sha256', pepper).update(normalized).digest('hex');
}
