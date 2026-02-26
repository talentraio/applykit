import type { FormatSettingsConfig } from '../../types/format-settings-config';
import {
  GRAMMATICAL_GENDER_MAP,
  RegisterInputSchema,
  USER_STATUS_MAP,
  WORK_FORMAT_MAP
} from '@int/schema';
import {
  formatSettingsRepository,
  profileRepository,
  userRepository
} from '../../data/repositories';
import { sendVerificationEmail } from '../../services/email';
import {
  generateToken,
  getTokenExpiry,
  hashPassword,
  validatePasswordStrength
} from '../../services/password';
import { assertEmailNotSuppressed } from '../../utils/suppression-guard';

/**
 * Registration Endpoint
 *
 * Creates a new user with email/password authentication.
 * Sends verification email and auto-logs in the user.
 *
 * POST /api/auth/register
 *
 * Feature: 003-auth-expansion
 */

export default defineEventHandler(async event => {
  const body = await readBody(event);

  // Validate input
  const parsed = RegisterInputSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message ?? 'Invalid input'
    });
  }

  const { email, password, firstName, lastName } = parsed.data;

  // Check if email is suppressed (anti-abuse)
  await assertEmailNotSuppressed(email);

  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    throw createError({
      statusCode: 400,
      message: passwordValidation.errors[0] ?? 'Invalid password'
    });
  }

  // Check if email already exists
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    if (
      existingUser.status === USER_STATUS_MAP.BLOCKED ||
      existingUser.status === USER_STATUS_MAP.DELETED
    ) {
      throw createError({
        statusCode: 403,
        message: 'Account is not allowed to sign in'
      });
    }

    if (existingUser.status === USER_STATUS_MAP.INVITED) {
      if (!existingUser.emailVerified) {
        throw createError({
          statusCode: 403,
          message: 'invite_email_not_verified'
        });
      }

      const passwordHash = await hashPassword(password);
      const activated = await userRepository.activateInvitedWithPassword({
        id: existingUser.id,
        passwordHash
      });

      if (!activated) {
        throw createError({
          statusCode: 500,
          message: 'Failed to activate invited user'
        });
      }

      const config = useRuntimeConfig(event);
      const formatDefaults = (config.public.formatSettings as FormatSettingsConfig).defaults;
      await formatSettingsRepository.seedDefaults(activated.id, formatDefaults);

      const existingProfile = await profileRepository.findByUserId(activated.id);
      if (existingProfile) {
        await profileRepository.update(activated.id, {
          firstName,
          lastName,
          email
        });
      } else {
        await profileRepository.create(activated.id, {
          firstName,
          lastName,
          email,
          country: '',
          searchRegion: '',
          workFormat: WORK_FORMAT_MAP.REMOTE,
          grammaticalGender: GRAMMATICAL_GENDER_MAP.NEUTRAL,
          languages: []
        });
      }

      await setUserSession(event, {
        user: {
          id: activated.id,
          email: activated.email,
          role: activated.role
        }
      });

      return { success: true };
    }

    throw createError({
      statusCode: 409,
      message: 'Email already registered'
    });
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Generate verification token
  const emailVerificationToken = generateToken();
  const emailVerificationExpires = getTokenExpiry(24); // 24 hours

  // Create user
  const user = await userRepository.createWithPassword({
    email,
    passwordHash,
    emailVerificationToken,
    emailVerificationExpires
  });

  // Seed default format settings
  const config = useRuntimeConfig(event);
  const formatDefaults = (config.public.formatSettings as FormatSettingsConfig).defaults;
  await formatSettingsRepository.seedDefaults(user.id, formatDefaults);

  // Create basic profile with registration data
  // This ensures firstName, lastName, and email are pre-filled in profile form
  await profileRepository.create(user.id, {
    firstName,
    lastName,
    email,
    country: '', // Will be filled by user in profile form
    searchRegion: '', // Will be filled by user in profile form
    workFormat: WORK_FORMAT_MAP.REMOTE, // Default value
    grammaticalGender: GRAMMATICAL_GENDER_MAP.NEUTRAL, // Default neutral style
    languages: [] // Will be filled by user in profile form
  });

  // Send verification email
  await sendVerificationEmail(user.email, firstName, emailVerificationToken);

  // Auto-login after registration
  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  });

  return { success: true };
});
