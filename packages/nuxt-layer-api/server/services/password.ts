import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';

/**
 * Password Service
 *
 * Handles password hashing, verification, and token generation
 * Uses bcryptjs for password hashing (no native dependencies)
 *
 * Feature: 003-auth-expansion
 */

const SALT_ROUNDS = 12;

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a secure random token (32 bytes, hex encoded)
 * Used for email verification and password reset
 */
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Validate password against requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 number
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get token expiry date
 */
export function getTokenExpiry(hours: number): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry;
}

/**
 * Check if token has expired
 */
export function isTokenExpired(expires: Date | null): boolean {
  if (!expires) return true;
  return new Date() > expires;
}
