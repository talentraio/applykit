import { USER_STATUS_MAP } from '@int/schema';
import { z } from 'zod';
import { userRepository } from '../../data/repositories';
import { verifyPassword } from '../../services/password';

/**
 * Login Endpoint
 *
 * Authenticates a user with email/password.
 * Returns generic error message to prevent email enumeration.
 *
 * POST /api/auth/login
 *
 * Feature: 003-auth-expansion
 */

const LoginInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export default defineEventHandler(async event => {
  const body = await readBody(event);

  // Validate input
  const parsed = LoginInputSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message ?? 'Invalid input'
    });
  }

  const { email, password } = parsed.data;

  // Find user by email (with password hash)
  const user = await userRepository.findByEmailWithPassword(email);

  // Generic error for security (prevents email enumeration)
  const invalidCredentialsError = createError({
    statusCode: 401,
    message: 'Invalid credentials'
  });

  // User not found
  if (!user) {
    throw invalidCredentialsError;
  }

  // User doesn't have a password (OAuth-only account)
  if (!user.passwordHash) {
    throw invalidCredentialsError;
  }

  // Check account status
  if (user.status === USER_STATUS_MAP.BLOCKED || user.status === USER_STATUS_MAP.DELETED) {
    throw createError({
      statusCode: 403,
      message: 'Account is not allowed to sign in'
    });
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw invalidCredentialsError;
  }

  // Update last login
  await userRepository.updateLastLogin(user.id);

  // Set session
  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  });

  return { success: true };
});
