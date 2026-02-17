import type { Profile, Role, UserPublic, UserStatus } from '@int/schema';

const adminUsersUrl = '/api/admin/users';

export type AdminUser = Pick<
  UserPublic,
  'id' | 'email' | 'role' | 'status' | 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'deletedAt'
>;

export type AdminUserUsage = {
  parse: number;
  generate: number;
  export: number;
};

export type AdminUserStats = {
  resumeCount: number;
  vacancyCount: number;
  generationCount: number;
  todayUsage: AdminUserUsage;
  totalGenerations: number;
  averageGenerationsPerDay30d: number;
  averageGenerationsPerDay7d: number;
  averageGenerationsPerWeek30d: number;
  costLast30Days: number;
  costMonthToDate: number;
};

export type AdminUserDetail = {
  user: AdminUser;
  profile: Profile | null;
  stats: AdminUserStats;
};

export type AdminUsersResponse = {
  users: AdminUser[];
  total: number;
};

export type AdminUserInviteInput = {
  email: string;
  role: Role;
};

export type AdminUserInviteResponse = AdminUser & {
  inviteEmailSent: boolean;
  inviteEmailError?: string;
};

export type AdminUserInviteResendResponse = {
  inviteEmailSent: boolean;
  inviteEmailError?: string;
};

export type AdminUserHardDeleteResponse = {
  success: true;
};

export type AdminUserStatusInput = {
  blocked: boolean;
};

export type AdminUsersQuery = {
  search?: string;
  role?: Role;
  status?: UserStatus;
  limit?: number;
  offset?: number;
};

/**
 * Admin Users API
 *
 * Handles admin user management endpoints.
 */
export const adminUsersApi = {
  /**
   * Fetch admin users list
   */
  async fetchAll(params: AdminUsersQuery = {}): Promise<AdminUsersResponse> {
    const query: AdminUsersQuery = {};

    if (params.search) {
      query.search = params.search;
    }

    if (params.role) {
      query.role = params.role;
    }

    if (params.status) {
      query.status = params.status;
    }

    if (typeof params.limit === 'number') {
      query.limit = params.limit;
    }

    if (typeof params.offset === 'number') {
      query.offset = params.offset;
    }

    return await useApi(adminUsersUrl, {
      method: 'GET',
      query
    });
  },

  /**
   * Fetch user detail by ID
   */
  async fetchById(id: string): Promise<AdminUserDetail> {
    return await useApi(`${adminUsersUrl}/${id}`, {
      method: 'GET'
    });
  },

  /**
   * Update user role
   */
  async updateRole(id: string, role: Role): Promise<AdminUser> {
    return await useApi(`${adminUsersUrl}/${id}/role`, {
      method: 'PUT',
      body: { role }
    });
  },

  /**
   * Update user status
   */
  async updateStatus(id: string, input: AdminUserStatusInput): Promise<AdminUser> {
    return await useApi(`${adminUsersUrl}/${id}/status`, {
      method: 'PUT',
      body: input
    });
  },

  /**
   * Invite user by email
   */
  async inviteUser(input: AdminUserInviteInput): Promise<AdminUserInviteResponse> {
    return await useApi(adminUsersUrl, {
      method: 'POST',
      body: input
    });
  },
  /**
   * Resend invite email for existing invited user
   */
  async resendInvite(id: string): Promise<AdminUserInviteResendResponse> {
    return await useApi(`${adminUsersUrl}/${id}/invite`, {
      method: 'POST'
    });
  },
  /**
   * Delete user (mark as deleted)
   */
  async deleteUser(id: string): Promise<AdminUser> {
    return await useApi(`${adminUsersUrl}/${id}`, {
      method: 'DELETE'
    });
  },

  /**
   * Restore soft-deleted user
   */
  async restoreUser(id: string): Promise<AdminUser> {
    return await useApi(`${adminUsersUrl}/${id}/restore`, {
      method: 'POST'
    });
  },

  /**
   * Permanently delete soft-deleted user
   */
  async hardDeleteUser(id: string): Promise<AdminUserHardDeleteResponse> {
    return await useApi(`${adminUsersUrl}/${id}/hard`, {
      method: 'DELETE'
    });
  }
};
