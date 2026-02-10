import type {
  AdminRoleSettings,
  AdminRoleSettingsInput,
  AdminRolesResponse
} from '../infrastructure/admin-roles.api';
import { useAdminRolesStore } from '../stores/admin-roles';

export type UseAdminRolesReturn = {
  roles: ComputedRef<AdminRoleSettings[]>;
  current: ComputedRef<AdminRoleSettings | null>;
  saving: ComputedRef<boolean>;
  hasRoles: ComputedRef<boolean>;
  fetchRoles: () => Promise<AdminRolesResponse>;
  fetchRole: (role: AdminRoleSettings['role']) => Promise<AdminRoleSettings>;
  updateRole: (
    role: AdminRoleSettings['role'],
    input: AdminRoleSettingsInput
  ) => Promise<AdminRoleSettings>;
};

export function useAdminRoles(): UseAdminRolesReturn {
  const store = useAdminRolesStore();

  return {
    roles: computed(() => store.roles),
    current: computed(() => store.current),
    saving: computed(() => store.saving),
    hasRoles: computed(() => store.hasRoles),
    fetchRoles: () => store.fetchRoles(),
    fetchRole: (role: AdminRoleSettings['role']) => store.fetchRole(role),
    updateRole: (role: AdminRoleSettings['role'], input: AdminRoleSettingsInput) =>
      store.updateRole(role, input)
  };
}
