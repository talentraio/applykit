import type { Role, UserPublic } from '@int/schema';
import { RoleSchema } from '@int/schema';
import { z } from 'zod';
import { userRepository } from '../../../data/repositories';
import { sendVerificationEmail } from '../../../services/email';
import { generateToken } from '../../../services/password';
import { EMAIL_VERIFICATION_FLOW_MAP } from '../../../utils/email-verification-flow';
import { requireSuperAdmin } from '../../../utils/session-helpers';

/**
 * POST /api/admin/users
 *
 * Invite a user by email with a role
 * Admin-only endpoint
 */

type AdminUser = Pick<
  UserPublic,
  'id' | 'email' | 'role' | 'status' | 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'deletedAt'
>;

type AdminInviteCreateResponse = AdminUser & {
  inviteEmailSent: boolean;
  inviteEmailError?: string;
};

type AdminUserInput = {
  email: string;
  role: Role;
};

const AdminUserInputSchema = z.object({
  email: z.string().email(),
  role: RoleSchema
});

export default defineEventHandler(async (event): Promise<AdminInviteCreateResponse> => {
  await requireSuperAdmin(event);

  const body = await readBody(event);
  const validation = AdminUserInputSchema.safeParse(body);

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: validation.error.errors
    });
  }

  const payload: AdminUserInput = validation.data;

  const exists = await userRepository.existsByEmail(payload.email);
  if (exists) {
    throw createError({
      statusCode: 409,
      message: 'User with this email already exists'
    });
  }

  const user = await userRepository.createInvited({
    email: payload.email,
    role: payload.role
  });

  const verificationToken = generateToken();

  await userRepository.setEmailVerificationToken(user.id, verificationToken, null);

  const firstName = user.email.split('@')[0] ?? 'User';
  const inviteEmailSent = await sendVerificationEmail(
    user.email,
    firstName,
    verificationToken,
    EMAIL_VERIFICATION_FLOW_MAP.INVITE
  );

  const inviteEmailError = inviteEmailSent ? undefined : 'failed_to_send_invite_email';

  setResponseStatus(event, 201);

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    deletedAt: user.deletedAt,
    inviteEmailSent,
    inviteEmailError
  };
});
