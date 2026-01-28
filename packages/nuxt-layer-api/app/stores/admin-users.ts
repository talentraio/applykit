import type {
  AdminUser,
  AdminUserDetail,
  AdminUserInviteInput,
  AdminUsersQuery,
  AdminUsersResponse,
  AdminUserStatusInput
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
     * Invite a new user
     */
    async inviteUser(input: AdminUserInviteInput): Promise<AdminUser> {
      this.loading = true;
      this.error = null;

      try {
        const created = await adminUsersApi.inviteUser(input);
        return created;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to invite user');
        throw this.error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Delete user (mark as deleted)
     */
    async deleteUser(id: string): Promise<AdminUser> {
      this.loading = true;
      this.error = null;

      try {
        const deleted = await adminUsersApi.deleteUser(id);
        this.users = this.users.filter(user => user.id !== deleted.id);

        const currentDetail = this.detail;
        if (currentDetail && currentDetail.user.id === deleted.id) {
          this.detail = {
            ...currentDetail,
            user: { ...currentDetail.user, ...deleted }
          };
        }

        return deleted;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to delete user');
        throw this.error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Update user status
     */
    async updateStatus(id: string, input: AdminUserStatusInput): Promise<AdminUser> {
      this.loading = true;
      this.error = null;

      try {
        const updated = await adminUsersApi.updateStatus(id, input);
        const index = this.users.findIndex(user => user.id === updated.id);

        if (index >= 0) {
          this.users[index] = updated;
        }

        const currentDetail = this.detail;
        if (currentDetail && currentDetail.user.id === updated.id) {
          this.detail = {
            ...currentDetail,
            user: { ...currentDetail.user, ...updated }
          };
        }

        return updated;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to update user status');
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
