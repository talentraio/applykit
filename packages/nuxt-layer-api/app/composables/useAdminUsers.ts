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
  AdminUsersQuery,
  AdminUsersResponse
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
    updateRole: (id: string, role: AdminUser['role']) => store.updateRole(id, role)
  };
}
