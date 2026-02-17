export const EMAIL_VERIFICATION_FLOW_MAP = {
  VERIFICATION: 'verification',
  INVITE: 'invite'
} as const;

export type EmailVerificationFlow =
  (typeof EMAIL_VERIFICATION_FLOW_MAP)[keyof typeof EMAIL_VERIFICATION_FLOW_MAP];

export type EmailVerificationErrorCode = 'missing_token' | 'invalid_token' | 'expired_token';

export function resolveEmailVerificationFlow(value: unknown): EmailVerificationFlow {
  if (value === EMAIL_VERIFICATION_FLOW_MAP.INVITE) {
    return EMAIL_VERIFICATION_FLOW_MAP.INVITE;
  }

  return EMAIL_VERIFICATION_FLOW_MAP.VERIFICATION;
}

export function buildEmailVerificationRedirectPath(params: {
  flow: EmailVerificationFlow;
  verified: boolean;
  error?: EmailVerificationErrorCode;
}): string {
  const basePath = params.flow === EMAIL_VERIFICATION_FLOW_MAP.INVITE ? '/resume' : '/profile';

  const searchParams = new URLSearchParams({
    verified: params.verified ? 'true' : 'false'
  });

  if (!params.verified && params.error) {
    searchParams.set('error', params.error);
  }

  return `${basePath}?${searchParams.toString()}`;
}
