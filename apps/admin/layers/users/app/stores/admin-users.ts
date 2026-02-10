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
  } => ({
    users: [],
    total: 0,
    detail: null
  }),

  getters: {
    hasUsers: state => state.users.length > 0
  },

  actions: {
    toError(error: unknown, fallback: string): Error {
      return error instanceof Error ? error : new Error(fallback);
    },

    /**
     * Fetch users list
     */
    async fetchUsers(params: AdminUsersQuery = {}): Promise<AdminUsersResponse> {
      try {
        const response = await adminUsersApi.fetchAll(params);
        this.users = response.users;
        this.total = response.total;
        return response;
      } catch (err) {
        throw this.toError(err, 'Failed to fetch users');
      }
    },

    /**
     * Fetch user detail
     */
    async fetchUserDetail(id: string): Promise<AdminUserDetail> {
      try {
        const detail = await adminUsersApi.fetchById(id);
        this.detail = detail;
        return detail;
      } catch (err) {
        throw this.toError(err, 'Failed to fetch user detail');
      }
    },

    /**
     * Update user role
     */
    async updateRole(id: string, role: AdminUser['role']): Promise<AdminUser> {
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
        throw this.toError(err, 'Failed to update user role');
      }
    },

    /**
     * Invite a new user
     */
    async inviteUser(input: AdminUserInviteInput): Promise<AdminUser> {
      try {
        const created = await adminUsersApi.inviteUser(input);
        return created;
      } catch (err) {
        throw this.toError(err, 'Failed to invite user');
      }
    },

    /**
     * Delete user (mark as deleted)
     */
    async deleteUser(id: string): Promise<AdminUser> {
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
        throw this.toError(err, 'Failed to delete user');
      }
    },

    /**
     * Update user status
     */
    async updateStatus(id: string, input: AdminUserStatusInput): Promise<AdminUser> {
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
        throw this.toError(err, 'Failed to update user status');
      }
    },

    /**
     * Reset store state
     */
    $reset() {
      this.users = [];
      this.total = 0;
      this.detail = null;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAdminUsersStore, import.meta.hot));
}
