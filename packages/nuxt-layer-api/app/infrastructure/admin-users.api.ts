import type { Profile, Role, UserPublic } from '@int/schema';

const adminUsersUrl = '/api/admin/users';

export type AdminUser = Pick<UserPublic, 'id' | 'email' | 'role' | 'createdAt'>;

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

export type AdminUsersQuery = {
  search?: string;
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
  }
};
