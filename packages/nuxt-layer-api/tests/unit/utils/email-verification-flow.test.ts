import { describe, expect, it } from 'vitest';
import {
  buildEmailVerificationRedirectPath,
  EMAIL_VERIFICATION_FLOW_MAP,
  resolveEmailVerificationFlow
} from '../../../server/utils/email-verification-flow';

describe('email verification flow utils', () => {
  it('resolves invite flow only for supported literal value', () => {
    expect(resolveEmailVerificationFlow(EMAIL_VERIFICATION_FLOW_MAP.INVITE)).toBe(
      EMAIL_VERIFICATION_FLOW_MAP.INVITE
    );
    expect(resolveEmailVerificationFlow('verification')).toBe(
      EMAIL_VERIFICATION_FLOW_MAP.VERIFICATION
    );
    expect(resolveEmailVerificationFlow('unknown')).toBe(EMAIL_VERIFICATION_FLOW_MAP.VERIFICATION);
    expect(resolveEmailVerificationFlow(undefined)).toBe(EMAIL_VERIFICATION_FLOW_MAP.VERIFICATION);
  });

  it('builds profile redirect for verification flow', () => {
    expect(
      buildEmailVerificationRedirectPath({
        flow: EMAIL_VERIFICATION_FLOW_MAP.VERIFICATION,
        verified: true
      })
    ).toBe('/profile?verified=true');

    expect(
      buildEmailVerificationRedirectPath({
        flow: EMAIL_VERIFICATION_FLOW_MAP.VERIFICATION,
        verified: false,
        error: 'invalid_token'
      })
    ).toBe('/profile?verified=false&error=invalid_token');
  });

  it('builds resume redirect for invite flow', () => {
    expect(
      buildEmailVerificationRedirectPath({
        flow: EMAIL_VERIFICATION_FLOW_MAP.INVITE,
        verified: true
      })
    ).toBe('/resume?verified=true');

    expect(
      buildEmailVerificationRedirectPath({
        flow: EMAIL_VERIFICATION_FLOW_MAP.INVITE,
        verified: false,
        error: 'expired_token'
      })
    ).toBe('/resume?verified=false&error=expired_token');
  });
});
