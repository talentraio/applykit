import { USER_STATUS_MAP } from '@int/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const userRepositoryMock = {
  existsByEmail: vi.fn(),
  createInvited: vi.fn(),
  setEmailVerificationToken: vi.fn(),
  findById: vi.fn()
};

const sendVerificationEmailMock = vi.fn();
const generateTokenMock = vi.fn(() => 'verification-token');
const getTokenExpiryMock = vi.fn(() => new Date('2026-02-18T00:00:00Z'));
const requireSuperAdminMock = vi.fn(async () => {});

const readBodyMock = vi.fn(async (event: { body: unknown }) => event.body);
const getRouterParamMock = vi.fn(
  (event: { params?: Record<string, string> }, key: string): string | undefined =>
    event.params?.[key]
);
const setResponseStatusMock = vi.fn();

const createErrorShim = (input: { statusCode: number; message: string; data?: unknown }): Error => {
  const error = new Error(input.message);
  Object.assign(error, input);
  return error;
};

vi.mock('../../../server/data/repositories', () => ({
  userRepository: userRepositoryMock
}));

vi.mock('../../../server/services/email', () => ({
  sendVerificationEmail: sendVerificationEmailMock
}));

vi.mock('../../../server/services/password', () => ({
  generateToken: generateTokenMock,
  getTokenExpiry: getTokenExpiryMock
}));

vi.mock('../../../server/utils/session-helpers', () => ({
  requireSuperAdmin: requireSuperAdminMock
}));

beforeEach(() => {
  userRepositoryMock.existsByEmail.mockReset();
  userRepositoryMock.createInvited.mockReset();
  userRepositoryMock.setEmailVerificationToken.mockReset();
  userRepositoryMock.findById.mockReset();

  sendVerificationEmailMock.mockReset();
  generateTokenMock.mockClear();
  getTokenExpiryMock.mockClear();
  requireSuperAdminMock.mockClear();
  readBodyMock.mockClear();
  getRouterParamMock.mockClear();
  setResponseStatusMock.mockClear();

  Object.assign(globalThis, {
    defineEventHandler: (handler: unknown) => handler,
    readBody: readBodyMock,
    getRouterParam: getRouterParamMock,
    setResponseStatus: setResponseStatusMock,
    createError: createErrorShim
  });
});

describe('admin users invite api', () => {
  it('returns created invite with inviteEmailSent=true when email delivery succeeds', async () => {
    userRepositoryMock.existsByEmail.mockResolvedValueOnce(false);
    userRepositoryMock.createInvited.mockResolvedValueOnce({
      id: 'user-1',
      email: 'invited@example.com',
      role: 'public',
      status: USER_STATUS_MAP.INVITED,
      createdAt: new Date('2026-02-17T10:00:00Z'),
      updatedAt: new Date('2026-02-17T10:00:00Z'),
      lastLoginAt: null,
      deletedAt: null
    });
    userRepositoryMock.setEmailVerificationToken.mockResolvedValueOnce({});
    sendVerificationEmailMock.mockResolvedValueOnce(true);

    const handlerModule = await import('../../../server/api/admin/users/index.post');

    const event = {
      body: {
        email: 'invited@example.com',
        role: 'public'
      }
    };

    const response = await handlerModule.default(event as never);

    expect(response).toMatchObject({
      id: 'user-1',
      email: 'invited@example.com',
      role: 'public',
      status: USER_STATUS_MAP.INVITED,
      inviteEmailSent: true
    });
    expect(response.inviteEmailError).toBeUndefined();
    expect(sendVerificationEmailMock).toHaveBeenCalledWith(
      'invited@example.com',
      'invited',
      'verification-token',
      'invite'
    );
    expect(setResponseStatusMock).toHaveBeenCalledWith(event, 201);
  });

  it('returns created invite with inviteEmailError when delivery fails', async () => {
    userRepositoryMock.existsByEmail.mockResolvedValueOnce(false);
    userRepositoryMock.createInvited.mockResolvedValueOnce({
      id: 'user-2',
      email: 'failed@example.com',
      role: 'friend',
      status: USER_STATUS_MAP.INVITED,
      createdAt: new Date('2026-02-17T11:00:00Z'),
      updatedAt: new Date('2026-02-17T11:00:00Z'),
      lastLoginAt: null,
      deletedAt: null
    });
    userRepositoryMock.setEmailVerificationToken.mockResolvedValueOnce({});
    sendVerificationEmailMock.mockResolvedValueOnce(false);

    const handlerModule = await import('../../../server/api/admin/users/index.post');

    const response = await handlerModule.default({
      body: {
        email: 'failed@example.com',
        role: 'friend'
      }
    } as never);

    expect(response.inviteEmailSent).toBe(false);
    expect(response.inviteEmailError).toBe('failed_to_send_invite_email');
  });

  it('rejects resend when user status is not invited', async () => {
    userRepositoryMock.findById.mockResolvedValueOnce({
      id: 'user-3',
      email: 'active@example.com',
      status: USER_STATUS_MAP.ACTIVE
    });

    const handlerModule = await import('../../../server/api/admin/users/[id]/invite.post');

    await expect(
      handlerModule.default({
        params: {
          id: 'user-3'
        }
      } as never)
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'User is not in invited status'
    });
  });

  it('resends invite for invited user and returns success contract', async () => {
    userRepositoryMock.findById.mockResolvedValueOnce({
      id: 'user-4',
      email: 'invite4@example.com',
      status: USER_STATUS_MAP.INVITED
    });
    userRepositoryMock.setEmailVerificationToken.mockResolvedValueOnce({});
    sendVerificationEmailMock.mockResolvedValueOnce(true);

    const handlerModule = await import('../../../server/api/admin/users/[id]/invite.post');

    const event = {
      params: {
        id: 'user-4'
      }
    };

    const response = await handlerModule.default(event as never);

    expect(response).toEqual({
      inviteEmailSent: true,
      inviteEmailError: undefined
    });
    expect(setResponseStatusMock).toHaveBeenCalledWith(event, 200);
  });
});
