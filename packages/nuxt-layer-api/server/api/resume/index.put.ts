import type { ResumeContent } from '@int/schema';
import { ResumeContentSchema } from '@int/schema';
import { resumeRepository } from '../../data/repositories';
import { resumeVersionRepository } from '../../data/repositories/resume-version';

/**
 * PUT /api/resume
 *
 * Update current user's resume content and/or title
 * Automatically creates a version snapshot on content change
 *
 * Request:
 * - Content-Type: application/json
 * - Fields (all optional):
 *   - content: ResumeContent (updates resume content)
 *   - title: string (updates resume title)
 *
 * Response:
 * - Updated Resume object
 * - 404: Resume not found
 * - 400: Validation error
 *
 * Version History:
 * - Creates new version only if content changes
 * - Keeps max N versions (configurable via runtimeConfig.resume.maxVersions)
 * - Automatically prunes old versions
 */
export default defineEventHandler(async event => {
  // Require authentication
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  // Get user's single resume
  const resume = await resumeRepository.findLatestByUserId(userId);
  if (!resume) {
    throw createError({
      statusCode: 404,
      message: 'Resume not found'
    });
  }

  // Parse request body
  const body = await readBody<{
    content?: ResumeContent;
    title?: string;
  }>(event);

  const updateData: Record<string, unknown> = {};

  // Validate and update content if provided
  if (body.content !== undefined) {
    const contentValidation = ResumeContentSchema.safeParse(body.content);
    if (!contentValidation.success) {
      throw createError({
        statusCode: 400,
        message: `Invalid resume content: ${contentValidation.error.message}`
      });
    }

    // Create version snapshot before updating content
    const currentVersionNumber = await resumeVersionRepository.getLatestVersionNumber(resume.id);
    const newVersionNumber = currentVersionNumber + 1;

    await resumeVersionRepository.createVersion({
      resumeId: resume.id,
      content: contentValidation.data,
      versionNumber: newVersionNumber
    });

    // Prune old versions
    const config = useRuntimeConfig();
    const maxVersions = config.resume?.maxVersions || 10;
    await resumeVersionRepository.pruneOldVersions(resume.id, maxVersions);

    updateData.content = contentValidation.data;
  }

  // Update title if provided
  if (body.title !== undefined && typeof body.title === 'string') {
    if (body.title.trim().length === 0) {
      throw createError({
        statusCode: 400,
        message: 'Title cannot be empty'
      });
    }
    updateData.title = body.title;
  }

  // If nothing to update, return existing resume
  if (Object.keys(updateData).length === 0) {
    return resume;
  }

  // Update resume
  let updatedResume = resume;

  if (updateData.content) {
    updatedResume =
      (await resumeRepository.updateContent(
        resume.id,
        userId,
        updateData.content as ResumeContent
      )) || resume;
  }

  if (updateData.title) {
    updatedResume =
      (await resumeRepository.updateTitle(resume.id, userId, updateData.title as string)) || resume;
  }

  return updatedResume;
});
