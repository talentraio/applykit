import { USER_ROLE_MAP, USER_STATUS_MAP } from '@int/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const userRepositoryMock = {
  findByEmail: vi.fn(),
  activateInvitedWithPassword: vi.fn(),
  createWithPassword: vi.fn()
};

const formatSettingsRepositoryMock = {
  seedDefaults: vi.fn()
};

const profileRepositoryMock = {
  findByUserId: vi.fn(),
  update: vi.fn(),
  create: vi.fn()
};

const sendVerificationEmailMock = vi.fn();

const generateTokenMock = vi.fn(() => 'generated-token');
const getTokenExpiryMock = vi.fn(() => new Date('2026-02-18T00:00:00Z'));
const hashPasswordMock = vi.fn(async () => 'hashed-password');
const validatePasswordStrengthMock = vi.fn(() => ({ valid: true, errors: [] as string[] }));

const assertEmailNotSuppressedMock = vi.fn(async () => {});

const readBodyMock = vi.fn(async (event: { body: unknown }) => event.body);
const setUserSessionMock = vi.fn(async () => {});
const useRuntimeConfigMock = vi.fn(() => ({
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

vi.mock('../../../server/data/repositories', () => ({
  userRepository: userRepositoryMock,
  formatSettingsRepository: formatSettingsRepositoryMock,
  profileRepository: profileRepositoryMock
}));

vi.mock('../../../server/services/email', () => ({
  sendVerificationEmail: sendVerificationEmailMock
}));

vi.mock('../../../server/services/password', () => ({
  generateToken: generateTokenMock,
  getTokenExpiry: getTokenExpiryMock,
  hashPassword: hashPasswordMock,
  validatePasswordStrength: validatePasswordStrengthMock
}));

vi.mock('../../../server/utils/suppression-guard', () => ({
  assertEmailNotSuppressed: assertEmailNotSuppressedMock
}));

beforeEach(() => {
  userRepositoryMock.findByEmail.mockReset();
  userRepositoryMock.activateInvitedWithPassword.mockReset();
  userRepositoryMock.createWithPassword.mockReset();
  formatSettingsRepositoryMock.seedDefaults.mockReset();
  profileRepositoryMock.findByUserId.mockReset();
  profileRepositoryMock.update.mockReset();
  profileRepositoryMock.create.mockReset();
  sendVerificationEmailMock.mockReset();
  generateTokenMock.mockClear();
  getTokenExpiryMock.mockClear();
  hashPasswordMock.mockClear();
  validatePasswordStrengthMock.mockClear();
  assertEmailNotSuppressedMock.mockClear();
  readBodyMock.mockClear();
  setUserSessionMock.mockClear();
  useRuntimeConfigMock.mockClear();

  Object.assign(globalThis, {
    defineEventHandler: (handler: unknown) => handler,
    readBody: readBodyMock,
    setUserSession: setUserSessionMock,
    useRuntimeConfig: useRuntimeConfigMock,
    createError: createErrorShim
  });
});

const payload = {
  email: 'invited@example.com',
  password: 'Password123',
  firstName: 'Invited',
  lastName: 'User'
};

describe('register endpoint invited activation', () => {
  it('returns 403 invite_email_not_verified for unverified invited user', async () => {
    userRepositoryMock.findByEmail.mockResolvedValueOnce({
      id: 'user-1',
      email: payload.email,
      status: USER_STATUS_MAP.INVITED,
      emailVerified: false
    });

    const handlerModule = await import('../../../server/api/auth/register.post');

    await expect(handlerModule.default({ body: payload } as never)).rejects.toMatchObject({
      statusCode: 403,
      message: 'invite_email_not_verified'
    });

    expect(userRepositoryMock.activateInvitedWithPassword).not.toHaveBeenCalled();
  });

  it('activates verified invited user with password and keeps assigned role', async () => {
    userRepositoryMock.findByEmail.mockResolvedValueOnce({
      id: 'user-2',
      email: payload.email,
      status: USER_STATUS_MAP.INVITED,
      emailVerified: true
    });

    userRepositoryMock.activateInvitedWithPassword.mockResolvedValueOnce({
      id: 'user-2',
      email: payload.email,
      role: USER_ROLE_MAP.FRIEND
    });

    profileRepositoryMock.findByUserId.mockResolvedValueOnce(null);
    profileRepositoryMock.create.mockResolvedValueOnce({});
    formatSettingsRepositoryMock.seedDefaults.mockResolvedValueOnce({});

    const handlerModule = await import('../../../server/api/auth/register.post');

    const response = await handlerModule.default({ body: payload } as never);

    expect(response).toEqual({ success: true });
    expect(hashPasswordMock).toHaveBeenCalledWith(payload.password);
    expect(userRepositoryMock.activateInvitedWithPassword).toHaveBeenCalledWith({
      id: 'user-2',
      passwordHash: 'hashed-password'
    });
    expect(formatSettingsRepositoryMock.seedDefaults).toHaveBeenCalledTimes(1);
    expect(profileRepositoryMock.create).toHaveBeenCalledTimes(1);
    expect(setUserSessionMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        user: expect.objectContaining({
          id: 'user-2',
          email: payload.email,
          role: USER_ROLE_MAP.FRIEND
        })
      })
    );
    expect(sendVerificationEmailMock).not.toHaveBeenCalled();
  });

  it('keeps blocked user restriction', async () => {
    userRepositoryMock.findByEmail.mockResolvedValueOnce({
      id: 'user-3',
      email: payload.email,
      status: USER_STATUS_MAP.BLOCKED,
      emailVerified: true
    });

    const handlerModule = await import('../../../server/api/auth/register.post');

    await expect(handlerModule.default({ body: payload } as never)).rejects.toMatchObject({
      statusCode: 403,
      message: 'Account is not allowed to sign in'
    });
  });

  it('returns conflict for existing non-invited user', async () => {
    userRepositoryMock.findByEmail.mockResolvedValueOnce({
      id: 'user-4',
      email: payload.email,
      status: USER_STATUS_MAP.ACTIVE,
      emailVerified: true
    });

    const handlerModule = await import('../../../server/api/auth/register.post');

    await expect(handlerModule.default({ body: payload } as never)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Email already registered'
    });
  });
});
