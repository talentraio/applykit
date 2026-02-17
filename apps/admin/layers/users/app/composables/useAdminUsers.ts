/**
 * Admin Users Composable
 *
 * Thin proxy over admin users store for convenient access in components.
 * Does NOT hold state - all state lives in useAdminUsersStore.
 *
 * Related: T135 (US8)
 */

import type {
  AdminUser,
  AdminUserDetail,
  AdminUserInviteInput,
  AdminUserInviteResendResponse,
  AdminUserInviteResponse,
  AdminUsersQuery,
  AdminUsersResponse,
  AdminUserStatusInput
} from '../infrastructure/admin-users.api';
import { useAdminUsersStore } from '../stores/admin-users';

export type UseAdminUsersReturn = {
  /**
   * List of users
   */
  users: ComputedRef<AdminUser[]>;

  /**
   * Total users count
   */
  total: ComputedRef<number>;

  /**
   * Current user detail
   */
  detail: ComputedRef<AdminUserDetail | null>;

  /**
   * Whether list has users
   */
  hasUsers: ComputedRef<boolean>;

  /**
   * Fetch users list
   */
  fetchUsers: (params?: AdminUsersQuery) => Promise<AdminUsersResponse>;

  /**
   * Fetch user detail
   */
  fetchUserDetail: (id: string) => Promise<AdminUserDetail>;

  /**
   * Update user role
   */
  updateRole: (id: string, role: AdminUser['role']) => Promise<AdminUser>;

  /**
   * Invite user by email
   */
  inviteUser: (input: AdminUserInviteInput) => Promise<AdminUserInviteResponse>;

  /**
   * Resend invite email for invited user
   */
  resendInvite: (id: string) => Promise<AdminUserInviteResendResponse>;

  /**
   * Update user status
   */
  updateStatus: (id: string, input: AdminUserStatusInput) => Promise<AdminUser>;

  /**
   * Delete user (mark as deleted)
   */
  deleteUser: (id: string) => Promise<AdminUser>;
};

export function useAdminUsers(): UseAdminUsersReturn {
  const store = useAdminUsersStore();

  return {
    users: computed(() => store.users),
    total: computed(() => store.total),
    detail: computed(() => store.detail),
    hasUsers: computed(() => store.hasUsers),
    fetchUsers: (params?: AdminUsersQuery) => store.fetchUsers(params),
    fetchUserDetail: (id: string) => store.fetchUserDetail(id),
    updateRole: (id: string, role: AdminUser['role']) => store.updateRole(id, role),
    inviteUser: (input: AdminUserInviteInput) => store.inviteUser(input),
    resendInvite: (id: string) => store.resendInvite(id),
    updateStatus: (id: string, input: AdminUserStatusInput) => store.updateStatus(id, input),
    deleteUser: (id: string) => store.deleteUser(id)
  };
}
