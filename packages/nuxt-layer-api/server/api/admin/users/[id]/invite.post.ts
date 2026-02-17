import { USER_STATUS_MAP } from '@int/schema';
import { userRepository } from '../../../../data/repositories';
import { sendVerificationEmail } from '../../../../services/email';
import { generateToken, getTokenExpiry } from '../../../../services/password';
import { EMAIL_VERIFICATION_FLOW_MAP } from '../../../../utils/email-verification-flow';
import { requireSuperAdmin } from '../../../../utils/session-helpers';

type AdminInviteResendResponse = {
  inviteEmailSent: boolean;
  inviteEmailError?: string;
};

/**
 * POST /api/admin/users/:id/invite
 *
 * Retry invite email delivery for an invited user.
 * Admin-only endpoint.
 */
export default defineEventHandler(async (event): Promise<AdminInviteResendResponse> => {
  await requireSuperAdmin(event);

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'User id is required'
    });
  }

  const user = await userRepository.findById(id);
  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    });
  }

  if (user.status !== USER_STATUS_MAP.INVITED) {
    throw createError({
      statusCode: 409,
      message: 'User is not in invited status'
    });
  }

  const verificationToken = generateToken();
  const verificationExpires = getTokenExpiry(24);

  await userRepository.setEmailVerificationToken(user.id, verificationToken, verificationExpires);

  const firstName = user.email.split('@')[0] ?? 'User';
  const inviteEmailSent = await sendVerificationEmail(
    user.email,
    firstName,
    verificationToken,
    EMAIL_VERIFICATION_FLOW_MAP.INVITE
  );

  const inviteEmailError = inviteEmailSent ? undefined : 'failed_to_send_invite_email';

  setResponseStatus(event, 200);

  return {
    inviteEmailSent,
    inviteEmailError
  };
});
