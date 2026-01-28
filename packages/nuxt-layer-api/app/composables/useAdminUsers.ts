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
   * Loading state
   */
  loading: ComputedRef<boolean>;

  /**
   * Error state
   */
  error: ComputedRef<Error | null>;

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
  inviteUser: (input: AdminUserInviteInput) => Promise<AdminUser>;

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
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    hasUsers: computed(() => store.hasUsers),
    fetchUsers: (params?: AdminUsersQuery) => store.fetchUsers(params),
    fetchUserDetail: (id: string) => store.fetchUserDetail(id),
    updateRole: (id: string, role: AdminUser['role']) => store.updateRole(id, role),
    inviteUser: (input: AdminUserInviteInput) => store.inviteUser(input),
    updateStatus: (id: string, input: AdminUserStatusInput) => store.updateStatus(id, input),
    deleteUser: (id: string) => store.deleteUser(id)
  };
}
