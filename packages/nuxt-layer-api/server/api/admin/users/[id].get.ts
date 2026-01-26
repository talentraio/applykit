import type { Profile, UserPublic } from '@int/schema';
import {
  generationRepository,
  profileRepository,
  resumeRepository,
  usageLogRepository,
  userRepository,
  vacancyRepository
} from '../../../data/repositories';
import { requireSuperAdmin } from '../../../utils/session-helpers';

/**
 * GET /api/admin/users/:id
 *
 * Get user detail with profile and usage stats
 * Admin-only endpoint
 *
 * Related: T133 (US8)
 */

type AdminUser = Pick<UserPublic, 'id' | 'email' | 'role' | 'createdAt'>;

type AdminUserStats = {
  resumeCount: number;
  vacancyCount: number;
  generationCount: number;
  todayUsage: {
    parse: number;
    generate: number;
    export: number;
  };
};

type AdminUserDetail = {
  user: AdminUser;
  profile: Profile | null;
  stats: AdminUserStats;
};

export default defineEventHandler(async (event): Promise<AdminUserDetail> => {
  // Require super_admin role
  await requireSuperAdmin(event);

  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'User ID is required'
    });
  }

  const user = await userRepository.findById(id);

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    });
  }

  const profile = await profileRepository.findByUserId(id);
  const transformedProfile = profile
    ? {
        ...profile,
        phones: profile.phones ?? undefined
      }
    : null;

  const [resumeCount, vacancyCount, generationCount, parseCount, generateCount, exportCount] =
    await Promise.all([
      resumeRepository.countByUserId(id),
      vacancyRepository.countByUserId(id),
      generationRepository.countByUserId(id),
      usageLogRepository.getDailyCount(id, 'parse'),
      usageLogRepository.getDailyCount(id, 'generate'),
      usageLogRepository.getDailyCount(id, 'export')
    ]);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    },
    profile: transformedProfile,
    stats: {
      resumeCount,
      vacancyCount,
      generationCount,
      todayUsage: {
        parse: parseCount,
        generate: generateCount,
        export: exportCount
      }
    }
  };
});
