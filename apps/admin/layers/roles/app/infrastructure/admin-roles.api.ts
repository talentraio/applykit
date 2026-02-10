import type { Role, RoleSettings, RoleSettingsInput } from '@int/schema';

const adminRolesUrl = '/api/admin/roles';

export type AdminRoleSettings = RoleSettings;
export type AdminRoleSettingsInput = Omit<RoleSettingsInput, 'role'>;

export type AdminRolesResponse = {
  roles: AdminRoleSettings[];
};

export const adminRolesApi = {
  async fetchAll(): Promise<AdminRolesResponse> {
    return await useApi(adminRolesUrl, {
      method: 'GET'
    });
  },

  async fetchByRole(role: Role): Promise<AdminRoleSettings> {
    return await useApi(`${adminRolesUrl}/${role}`, {
      method: 'GET'
    });
  },

  async updateRole(role: Role, input: AdminRoleSettingsInput): Promise<AdminRoleSettings> {
    return await useApi(`${adminRolesUrl}/${role}`, {
      method: 'PUT',
      body: input
    });
  }
};
