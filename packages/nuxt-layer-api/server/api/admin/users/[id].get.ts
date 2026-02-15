import type { Profile, UserPublic } from '@int/schema';
import { OPERATION_MAP } from '@int/schema';
import { startOfMonth, subDays } from 'date-fns';
import {
  generationRepository,
  profileRepository,
  resumeRepository,
  usageLogRepository,
  userRepository,
  vacancyRepository
} from '../../../data/repositories';
import { requireSuperAdmin } from '../../../utils/session-helpers';
import { toAbsoluteStorageUrl } from '../../../utils/storage-url';

/**
 * GET /api/admin/users/:id
 *
 * Get user detail with profile and usage stats
 * Admin-only endpoint
 *
 * Related: T133 (US8)
 */

type AdminUser = Pick<
  UserPublic,
  'id' | 'email' | 'role' | 'status' | 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'deletedAt'
>;

type AdminUserStats = {
  resumeCount: number;
  vacancyCount: number;
  generationCount: number;
  todayUsage: {
    parse: number;
    generate: number;
    export: number;
  };
  totalGenerations: number;
  averageGenerationsPerDay30d: number;
  averageGenerationsPerDay7d: number;
  averageGenerationsPerWeek30d: number;
  costLast30Days: number;
  costMonthToDate: number;
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
        phones: profile.phones ?? undefined,
        photoUrl: toAbsoluteStorageUrl(event, profile.photoUrl) ?? undefined
      }
    : null;

  const today = new Date();
  const last30Days = subDays(today, 30);
  const last7Days = subDays(today, 7);
  const monthStart = startOfMonth(today);

  const [
    resumeCount,
    vacancyCount,
    generationCount,
    parseCount,
    generateCount,
    exportCount,
    totalGenerations,
    totalGenerations30d,
    totalGenerations7d,
    costLast30Days,
    costMonthToDate
  ] = await Promise.all([
    resumeRepository.countByUserId(id),
    vacancyRepository.countByUserId(id),
    generationRepository.countByUserId(id),
    usageLogRepository.getDailyCount(id, OPERATION_MAP.PARSE),
    usageLogRepository.getDailyCount(id, OPERATION_MAP.GENERATE),
    usageLogRepository.getDailyCount(id, OPERATION_MAP.EXPORT),
    usageLogRepository.getOperationCount(id, OPERATION_MAP.GENERATE),
    usageLogRepository.getOperationCount(id, OPERATION_MAP.GENERATE, last30Days, today),
    usageLogRepository.getOperationCount(id, OPERATION_MAP.GENERATE, last7Days, today),
    usageLogRepository.getTotalCost(id, last30Days, today),
    usageLogRepository.getTotalCost(id, monthStart, today)
  ]);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      deletedAt: user.deletedAt
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
      },
      totalGenerations,
      averageGenerationsPerDay30d: Number((totalGenerations30d / 30).toFixed(2)),
      averageGenerationsPerDay7d: Number((totalGenerations7d / 7).toFixed(2)),
      averageGenerationsPerWeek30d: Number((totalGenerations30d / 4).toFixed(2)),
      costLast30Days,
      costMonthToDate
    }
  };
});
