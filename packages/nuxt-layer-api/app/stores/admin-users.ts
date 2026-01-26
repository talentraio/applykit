import type {
  AdminUser,
  AdminUserDetail,
  AdminUsersQuery,
  AdminUsersResponse
} from '../infrastructure/admin-users.api';
import { adminUsersApi } from '../infrastructure/admin-users.api';

/**
 * Admin Users Store
 *
 * Manages admin user list and detail state.
 */
export const useAdminUsersStore = defineStore('AdminUsersStore', {
  state: (): {
    users: AdminUser[];
    total: number;
    detail: AdminUserDetail | null;
    loading: boolean;
    error: Error | null;
  } => ({
    users: [],
    total: 0,
    detail: null,
    loading: false,
    error: null
  }),

  getters: {
    hasUsers: state => state.users.length > 0
  },

  actions: {
    /**
     * Fetch users list
     */
    async fetchUsers(params: AdminUsersQuery = {}): Promise<AdminUsersResponse> {
      this.loading = true;
      this.error = null;

      try {
        const response = await adminUsersApi.fetchAll(params);
        this.users = response.users;
        this.total = response.total;
        return response;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to fetch users');
        throw this.error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Fetch user detail
     */
    async fetchUserDetail(id: string): Promise<AdminUserDetail> {
      this.loading = true;
      this.error = null;

      try {
        const detail = await adminUsersApi.fetchById(id);
        this.detail = detail;
        return detail;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to fetch user detail');
        throw this.error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Update user role
     */
    async updateRole(id: string, role: AdminUser['role']): Promise<AdminUser> {
      this.loading = true;
      this.error = null;

      try {
        const updated = await adminUsersApi.updateRole(id, role);
        const index = this.users.findIndex(user => user.id === updated.id);

        if (index >= 0) {
          this.users[index] = updated;
        }

        const currentDetail = this.detail;
        if (currentDetail && currentDetail.user.id === updated.id) {
          this.detail = {
            ...currentDetail,
            user: { ...currentDetail.user, role: updated.role }
          };
        }

        return updated;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to update user role');
        throw this.error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Reset store state
     */
    $reset() {
      this.users = [];
      this.total = 0;
      this.detail = null;
      this.loading = false;
      this.error = null;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAdminUsersStore, import.meta.hot));
}
