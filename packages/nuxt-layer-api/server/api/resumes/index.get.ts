import { resumeRepository, userRepository } from '../../data/repositories';

/**
 * GET /api/resumes
 *
 * List all base resumes for the authenticated user (lightweight).
 * Returns id, name, isDefault (computed), createdAt, updatedAt.
 * Sort: default resume first, then createdAt DESC.
 *
 * Response: { items: ResumeListItem[] }
 */
export default defineEventHandler(async event => {
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  const [list, defaultResumeId] = await Promise.all([
    resumeRepository.findListByUserId(userId),
    userRepository.getDefaultResumeId(userId)
  ]);

  // Compute isDefault and sort: default first, then createdAt DESC (already sorted by createdAt DESC from repo)
  const items = list
    .map(r => ({
      id: r.id,
      name: r.name,
      isDefault: r.id === defaultResumeId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString()
    }))
    .sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return 0; // preserve createdAt DESC order from DB
    });

  return { items };
});
