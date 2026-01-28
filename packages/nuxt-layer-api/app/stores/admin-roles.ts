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
    loading: boolean;
    saving: boolean;
    error: Error | null;
  } => ({
    roles: [],
    current: null,
    loading: false,
    saving: false,
    error: null
  }),

  getters: {
    hasRoles: state => state.roles.length > 0
  },

  actions: {
    async fetchRoles(): Promise<AdminRolesResponse> {
      this.loading = true;
      this.error = null;

      try {
        const response = await adminRolesApi.fetchAll();
        this.roles = response.roles;
        return response;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to fetch roles');
        throw this.error;
      } finally {
        this.loading = false;
      }
    },

    async fetchRole(role: AdminRoleSettings['role']): Promise<AdminRoleSettings> {
      this.loading = true;
      this.error = null;

      try {
        const roleSettings = await adminRolesApi.fetchByRole(role);
        this.current = roleSettings;
        return roleSettings;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to fetch role');
        throw this.error;
      } finally {
        this.loading = false;
      }
    },

    async updateRole(
      role: AdminRoleSettings['role'],
      input: AdminRoleSettingsInput
    ): Promise<AdminRoleSettings> {
      this.saving = true;
      this.error = null;

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
        this.error = err instanceof Error ? err : new Error('Failed to update role');
        throw this.error;
      } finally {
        this.saving = false;
      }
    },

    $reset() {
      this.roles = [];
      this.current = null;
      this.loading = false;
      this.saving = false;
      this.error = null;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAdminRolesStore, import.meta.hot));
}
