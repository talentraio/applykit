import { USER_ROLE_MAP, USER_STATUS_MAP } from '@int/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const userRepositoryMock = {
  findByGoogleId: vi.fn(),
  findByLinkedInId: vi.fn(),
  findByEmail: vi.fn(),
  activateInvitedUser: vi.fn(),
  updateLastLogin: vi.fn(),
  create: vi.fn(),
  linkOAuthProvider: vi.fn()
};

const formatSettingsRepositoryMock = {
  seedDefaults: vi.fn()
};

const suppressionRepositoryMock = {
  isEmailSuppressed: vi.fn()
};

const getQueryMock = vi.fn((event: { query?: Record<string, unknown> }) => event.query ?? {});
const sendRedirectMock = vi.fn((_event: unknown, location: string): string => location);
const setUserSessionMock = vi.fn(async () => {});
const useRuntimeConfigMock = vi.fn(() => ({
  redirects: {
    authDefault: '/resume'
  },
  public: {
    formatSettings: {
      defaults: {
        ats: {},
        human: {}
      }
    }
  }
}));

const createErrorShim = (input: { statusCode: number; message: string; data?: unknown }): Error => {
  const error = new Error(input.message);
  Object.assign(error, input);
  return error;
};

vi.mock('h3', () => ({
  eventHandler: (handler: unknown) => handler,
  getQuery: getQueryMock
}));

vi.mock('../../../server/data/repositories', () => ({
  userRepository: userRepositoryMock,
  formatSettingsRepository: formatSettingsRepositoryMock,
  suppressionRepository: suppressionRepositoryMock
}));

beforeEach(() => {
  vi.resetModules();

  userRepositoryMock.findByGoogleId.mockReset();
  userRepositoryMock.findByLinkedInId.mockReset();
  userRepositoryMock.findByEmail.mockReset();
  userRepositoryMock.activateInvitedUser.mockReset();
  userRepositoryMock.updateLastLogin.mockReset();
  userRepositoryMock.create.mockReset();
  userRepositoryMock.linkOAuthProvider.mockReset();

  formatSettingsRepositoryMock.seedDefaults.mockReset();
  suppressionRepositoryMock.isEmailSuppressed.mockReset();

  getQueryMock.mockClear();
  sendRedirectMock.mockClear();
  setUserSessionMock.mockClear();
  useRuntimeConfigMock.mockClear();

  Object.assign(globalThis, {
    defineOAuthGoogleEventHandler: (hooks: {
      onSuccess: (event: unknown, payload: { user: unknown }) => Promise<unknown>;
      onError: (event: unknown, error: unknown) => Promise<unknown>;
    }) => {
      return async (event: { oauthUser: unknown }) =>
        hooks.onSuccess(event, { user: event.oauthUser });
    },
    defineOAuthLinkedInEventHandler: (hooks: {
      onSuccess: (event: unknown, payload: { user: unknown }) => Promise<unknown>;
      onError: (event: unknown, error: unknown) => Promise<unknown>;
    }) => {
      return async (event: { oauthUser: unknown }) =>
        hooks.onSuccess(event, { user: event.oauthUser });
    },
    useRuntimeConfig: useRuntimeConfigMock,
    sendRedirect: sendRedirectMock,
    setUserSession: setUserSessionMock,
    createError: createErrorShim
  });
});

describe('oauth invited activation regression', () => {
  it('activates invited user in Google flow and seeds format defaults', async () => {
    userRepositoryMock.findByGoogleId.mockResolvedValueOnce(null);
    userRepositoryMock.findByEmail.mockResolvedValueOnce({
      id: 'invited-user-1',
      email: 'invited-google@example.com',
      role: USER_ROLE_MAP.FRIEND,
      status: USER_STATUS_MAP.INVITED,
      googleId: null
    });
    userRepositoryMock.activateInvitedUser.mockResolvedValueOnce({
      id: 'invited-user-1',
      email: 'invited-google@example.com',
      role: USER_ROLE_MAP.FRIEND,
      status: USER_STATUS_MAP.ACTIVE,
      googleId: 'google-123'
    });
    userRepositoryMock.updateLastLogin.mockResolvedValueOnce(undefined);
    formatSettingsRepositoryMock.seedDefaults.mockResolvedValueOnce(undefined);

    const handlerModule = await import('../../../server/routes/auth/google');

    const response = await handlerModule.default({
      node: {
        req: {
          url: '/auth/google'
        }
      },
      query: {},
      oauthUser: {
        email: 'invited-google@example.com',
        sub: 'google-123'
      }
    } as never);

    expect(userRepositoryMock.activateInvitedUser).toHaveBeenCalledWith({
      id: 'invited-user-1',
      googleId: 'google-123'
    });
    expect(formatSettingsRepositoryMock.seedDefaults).toHaveBeenCalledWith(
      'invited-user-1',
      expect.any(Object)
    );
    expect(setUserSessionMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        user: expect.objectContaining({
          id: 'invited-user-1',
          email: 'invited-google@example.com',
          role: USER_ROLE_MAP.FRIEND
        })
      })
    );
    expect(userRepositoryMock.create).not.toHaveBeenCalled();
    expect(response).toBe('/resume');
  });

  it('activates invited user in LinkedIn flow and seeds format defaults', async () => {
    userRepositoryMock.findByLinkedInId.mockResolvedValueOnce(null);
    userRepositoryMock.findByEmail.mockResolvedValueOnce({
      id: 'invited-user-2',
      email: 'invited-linkedin@example.com',
      role: USER_ROLE_MAP.PROMO,
      status: USER_STATUS_MAP.INVITED,
      linkedInId: null
    });
    userRepositoryMock.activateInvitedUser.mockResolvedValueOnce({
      id: 'invited-user-2',
      email: 'invited-linkedin@example.com',
      role: USER_ROLE_MAP.PROMO,
      status: USER_STATUS_MAP.ACTIVE,
      linkedInId: 'linkedin-456'
    });
    userRepositoryMock.updateLastLogin.mockResolvedValueOnce(undefined);
    formatSettingsRepositoryMock.seedDefaults.mockResolvedValueOnce(undefined);

    const handlerModule = await import('../../../server/routes/auth/linkedin');

    const response = await handlerModule.default({
      node: {
        req: {
          url: '/auth/linkedin'
        }
      },
      query: {},
      oauthUser: {
        email: 'invited-linkedin@example.com',
        sub: 'linkedin-456'
      }
    } as never);

    expect(userRepositoryMock.activateInvitedUser).toHaveBeenCalledWith({
      id: 'invited-user-2',
      linkedInId: 'linkedin-456'
    });
    expect(formatSettingsRepositoryMock.seedDefaults).toHaveBeenCalledWith(
      'invited-user-2',
      expect.any(Object)
    );
    expect(setUserSessionMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        user: expect.objectContaining({
          id: 'invited-user-2',
          email: 'invited-linkedin@example.com',
          role: USER_ROLE_MAP.PROMO
        })
      })
    );
    expect(userRepositoryMock.create).not.toHaveBeenCalled();
    expect(response).toBe('/resume');
  });
});
