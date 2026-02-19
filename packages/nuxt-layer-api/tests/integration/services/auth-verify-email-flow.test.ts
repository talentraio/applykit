import { USER_STATUS_MAP } from '@int/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const userRepositoryMock = {
  findByEmailVerificationToken: vi.fn(),
  verifyEmail: vi.fn()
};

const getQueryMock = vi.fn((event: { query?: Record<string, unknown> }) => event.query ?? {});
const sendRedirectMock = vi.fn((_event: unknown, location: string): string => location);

vi.mock('h3', () => ({
  getQuery: getQueryMock
}));

vi.mock('../../../server/data/repositories', () => ({
  userRepository: userRepositoryMock
}));

beforeEach(() => {
  userRepositoryMock.findByEmailVerificationToken.mockReset();
  userRepositoryMock.verifyEmail.mockReset();
  getQueryMock.mockClear();
  sendRedirectMock.mockClear();

  Object.assign(globalThis, {
    defineEventHandler: (handler: unknown) => handler,
    sendRedirect: sendRedirectMock
  });
});

describe('verify email endpoint flow redirects', () => {
  it('redirects missing token to profile flow by default', async () => {
    const handlerModule = await import('../../../server/api/auth/verify-email.get');

    const response = await handlerModule.default({ query: {} } as never);

    expect(response).toBe('/profile?verified=false&error=missing_token');
    expect(userRepositoryMock.findByEmailVerificationToken).not.toHaveBeenCalled();
  });

  it('redirects invalid token to resume for invite flow', async () => {
    userRepositoryMock.findByEmailVerificationToken.mockResolvedValueOnce(null);

    const handlerModule = await import('../../../server/api/auth/verify-email.get');

    const response = await handlerModule.default({
      query: {
        token: 'token-1',
        flow: 'invite'
      }
    } as never);

    expect(response).toBe('/resume?verified=false&error=invalid_token');
    expect(userRepositoryMock.findByEmailVerificationToken).toHaveBeenCalledWith('token-1');
  });

  it('allows expired invite token when flow=invite and user is invited', async () => {
    userRepositoryMock.findByEmailVerificationToken.mockResolvedValueOnce({
      id: 'user-1',
      status: USER_STATUS_MAP.INVITED,
      emailVerificationExpires: new Date(Date.now() - 60_000)
    });
    userRepositoryMock.verifyEmail.mockResolvedValueOnce({
      id: 'user-1'
    });

    const handlerModule = await import('../../../server/api/auth/verify-email.get');

    const response = await handlerModule.default({
      query: {
        token: 'token-2',
        flow: 'invite'
      }
    } as never);

    expect(response).toBe('/resume?verified=true');
    expect(userRepositoryMock.verifyEmail).toHaveBeenCalledWith('user-1');
  });

  it('verifies invite token and redirects to resume success', async () => {
    userRepositoryMock.findByEmailVerificationToken.mockResolvedValueOnce({
      id: 'user-2',
      status: USER_STATUS_MAP.INVITED,
      emailVerificationExpires: new Date(Date.now() + 60_000)
    });
    userRepositoryMock.verifyEmail.mockResolvedValueOnce({
      id: 'user-2'
    });

    const handlerModule = await import('../../../server/api/auth/verify-email.get');

    const response = await handlerModule.default({
      query: {
        token: 'token-3',
        flow: 'invite'
      }
    } as never);

    expect(response).toBe('/resume?verified=true');
    expect(userRepositoryMock.verifyEmail).toHaveBeenCalledWith('user-2');
  });

  it('keeps expiry check for non-invite flow', async () => {
    userRepositoryMock.findByEmailVerificationToken.mockResolvedValueOnce({
      id: 'user-5',
      status: USER_STATUS_MAP.ACTIVE,
      emailVerificationExpires: new Date(Date.now() - 60_000)
    });

    const handlerModule = await import('../../../server/api/auth/verify-email.get');

    const response = await handlerModule.default({
      query: {
        token: 'token-5',
        flow: 'verification'
      }
    } as never);

    expect(response).toBe('/profile?verified=false&error=expired_token');
    expect(userRepositoryMock.verifyEmail).not.toHaveBeenCalled();
  });

  it('falls back unknown flow to profile redirect', async () => {
    userRepositoryMock.findByEmailVerificationToken.mockResolvedValueOnce({
      id: 'user-3',
      status: USER_STATUS_MAP.ACTIVE,
      emailVerificationExpires: new Date(Date.now() + 60_000)
    });
    userRepositoryMock.verifyEmail.mockResolvedValueOnce({
      id: 'user-3'
    });

    const handlerModule = await import('../../../server/api/auth/verify-email.get');

    const response = await handlerModule.default({
      query: {
        token: 'token-4',
        flow: 'unsupported'
      }
    } as never);

    expect(response).toBe('/profile?verified=true');
  });
});
