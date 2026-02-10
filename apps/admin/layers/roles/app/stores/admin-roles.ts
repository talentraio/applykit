import type {
  AdminRoleSettings,
  AdminRoleSettingsInput,
  AdminRolesResponse
} from '../infrastructure/admin-roles.api';
import { adminRolesApi } from '../infrastructure/admin-roles.api';

/**
 * Admin Roles Store
 *
 * Manages role settings for admins.
 */
export const useAdminRolesStore = defineStore('AdminRolesStore', {
  state: (): {
    roles: AdminRoleSettings[];
    current: AdminRoleSettings | null;
    saving: boolean;
  } => ({
    roles: [],
    current: null,
    saving: false
  }),

  getters: {
    hasRoles: state => state.roles.length > 0
  },

  actions: {
    toError(error: unknown, fallback: string): Error {
      return error instanceof Error ? error : new Error(fallback);
    },

    async fetchRoles(): Promise<AdminRolesResponse> {
      try {
        const response = await adminRolesApi.fetchAll();
        this.roles = response.roles;
        return response;
      } catch (err) {
        throw this.toError(err, 'Failed to fetch roles');
      }
    },

    async fetchRole(role: AdminRoleSettings['role']): Promise<AdminRoleSettings> {
      try {
        const roleSettings = await adminRolesApi.fetchByRole(role);
        this.current = roleSettings;
        return roleSettings;
      } catch (err) {
        throw this.toError(err, 'Failed to fetch role');
      }
    },

    async updateRole(
      role: AdminRoleSettings['role'],
      input: AdminRoleSettingsInput
    ): Promise<AdminRoleSettings> {
      this.saving = true;

      try {
        const updated = await adminRolesApi.updateRole(role, input);
        const index = this.roles.findIndex(item => item.role === role);

        if (index >= 0) {
          this.roles[index] = updated;
        }

        if (this.current && this.current.role === role) {
          this.current = updated;
        }

        return updated;
      } catch (err) {
        throw this.toError(err, 'Failed to update role');
      } finally {
        this.saving = false;
      }
    },

    $reset() {
      this.roles = [];
      this.current = null;
      this.saving = false;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAdminRolesStore, import.meta.hot));
}
