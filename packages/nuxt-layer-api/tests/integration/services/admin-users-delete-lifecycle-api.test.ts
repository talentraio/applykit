import { USER_STATUS_MAP } from '@int/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const userRepositoryMock = {
  findById: vi.fn(),
  restoreDeleted: vi.fn(),
  deletePermanently: vi.fn()
};

const suppressionRepositoryMock = {
  deleteByEmailHmac: vi.fn()
};

const requireSuperAdminMock = vi.fn(async () => {});
const computeEmailHmacMock = vi.fn(() => 'email-hmac');

const getRouterParamMock = vi.fn(
  (event: { params?: Record<string, string> }, key: string): string | undefined =>
    event.params?.[key]
);

const createErrorShim = (input: { statusCode: number; message: string; data?: unknown }): Error => {
  const error = new Error(input.message);
  Object.assign(error, input);
  return error;
};

vi.mock('../../../server/data/repositories', () => ({
  userRepository: userRepositoryMock,
  suppressionRepository: suppressionRepositoryMock
}));

vi.mock('../../../server/utils/session-helpers', () => ({
  requireSuperAdmin: requireSuperAdminMock
}));

vi.mock('../../../server/utils/email-hmac', () => ({
  computeEmailHmac: computeEmailHmacMock
}));

beforeEach(() => {
  userRepositoryMock.findById.mockReset();
  userRepositoryMock.restoreDeleted.mockReset();
  userRepositoryMock.deletePermanently.mockReset();
  suppressionRepositoryMock.deleteByEmailHmac.mockReset();
  requireSuperAdminMock.mockClear();
  computeEmailHmacMock.mockClear();
  getRouterParamMock.mockClear();

  Object.assign(globalThis, {
    defineEventHandler: (handler: unknown) => handler,
    getRouterParam: getRouterParamMock,
    createError: createErrorShim
  });
});

describe('admin users restore and hard-delete api', () => {
  it('restores deleted user to invited when lastLoginAt is null', async () => {
    userRepositoryMock.findById.mockResolvedValueOnce({
      id: 'user-1',
      email: 'invited@example.com',
      status: USER_STATUS_MAP.DELETED,
      lastLoginAt: null
    });

    userRepositoryMock.restoreDeleted.mockResolvedValueOnce({
      id: 'user-1',
      email: 'invited@example.com',
      role: 'public',
      status: USER_STATUS_MAP.INVITED,
      createdAt: new Date('2026-02-18T10:00:00Z'),
      updatedAt: new Date('2026-02-18T11:00:00Z'),
      lastLoginAt: null,
      deletedAt: null
    });

    const handlerModule = await import('../../../server/api/admin/users/[id]/restore.post');

    const response = await handlerModule.default({
      params: {
        id: 'user-1'
      }
    } as never);

    expect(userRepositoryMock.restoreDeleted).toHaveBeenCalledWith(
      'user-1',
      USER_STATUS_MAP.INVITED
    );
    expect(response.status).toBe(USER_STATUS_MAP.INVITED);
    expect(response.deletedAt).toBeNull();
  });

  it('restores deleted user to active when lastLoginAt exists', async () => {
    userRepositoryMock.findById.mockResolvedValueOnce({
      id: 'user-2',
      email: 'active@example.com',
      status: USER_STATUS_MAP.DELETED,
      lastLoginAt: new Date('2026-02-18T09:00:00Z')
    });

    userRepositoryMock.restoreDeleted.mockResolvedValueOnce({
      id: 'user-2',
      email: 'active@example.com',
      role: 'friend',
      status: USER_STATUS_MAP.ACTIVE,
      createdAt: new Date('2026-02-18T08:00:00Z'),
      updatedAt: new Date('2026-02-18T11:00:00Z'),
      lastLoginAt: new Date('2026-02-18T09:00:00Z'),
      deletedAt: null
    });

    const handlerModule = await import('../../../server/api/admin/users/[id]/restore.post');

    const response = await handlerModule.default({
      params: {
        id: 'user-2'
      }
    } as never);

    expect(userRepositoryMock.restoreDeleted).toHaveBeenCalledWith(
      'user-2',
      USER_STATUS_MAP.ACTIVE
    );
    expect(response.status).toBe(USER_STATUS_MAP.ACTIVE);
    expect(response.deletedAt).toBeNull();
  });

  it('rejects restore when user is not deleted', async () => {
    userRepositoryMock.findById.mockResolvedValueOnce({
      id: 'user-3',
      email: 'active@example.com',
      status: USER_STATUS_MAP.ACTIVE,
      lastLoginAt: new Date('2026-02-18T09:00:00Z')
    });

    const handlerModule = await import('../../../server/api/admin/users/[id]/restore.post');

    await expect(
      handlerModule.default({
        params: {
          id: 'user-3'
        }
      } as never)
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'User is not in deleted status'
    });
  });

  it('rejects hard delete when user is not deleted', async () => {
    userRepositoryMock.findById.mockResolvedValueOnce({
      id: 'user-4',
      email: 'active@example.com',
      status: USER_STATUS_MAP.ACTIVE
    });

    const handlerModule = await import('../../../server/api/admin/users/[id]/hard.delete');

    await expect(
      handlerModule.default({
        params: {
          id: 'user-4'
        }
      } as never)
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'User is not in deleted status'
    });
  });

  it('hard deletes deleted user and clears suppression by email hmac', async () => {
    userRepositoryMock.findById.mockResolvedValueOnce({
      id: 'user-5',
      email: 'deleted@example.com',
      status: USER_STATUS_MAP.DELETED
    });
    suppressionRepositoryMock.deleteByEmailHmac.mockResolvedValueOnce(1);
    userRepositoryMock.deletePermanently.mockResolvedValueOnce(true);

    const handlerModule = await import('../../../server/api/admin/users/[id]/hard.delete');

    const response = await handlerModule.default({
      params: {
        id: 'user-5'
      }
    } as never);

    expect(computeEmailHmacMock).toHaveBeenCalledWith('deleted@example.com');
    expect(suppressionRepositoryMock.deleteByEmailHmac).toHaveBeenCalledWith('email-hmac');
    expect(userRepositoryMock.deletePermanently).toHaveBeenCalledWith('user-5');
    expect(response).toEqual({ success: true });
  });
});
