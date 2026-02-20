import type { ResumeContent } from '@int/schema';
import { ResumeContentSchema } from '@int/schema';
import { resumeRepository } from '../../data/repositories';
import { resumeVersionRepository } from '../../data/repositories/resume-version';

/**
 * PUT /api/resumes/:id
 *
 * Update a specific resume content and/or title.
 * Creates a version snapshot when content is updated.
 *
 * Request:
 * - Content-Type: application/json
 * - Fields (all optional):
 *   - content: ResumeContent
 *   - title: string
 *
 * Response:
 * - Updated Resume object
 * - 404: Resume not found
 * - 400: Validation error
 */
export default defineEventHandler(async event => {
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Resume ID is required'
    });
  }

  const resume = await resumeRepository.findByIdAndUserId(id, userId);
  if (!resume) {
    throw createError({
      statusCode: 404,
      message: 'Resume not found'
    });
  }

  const body = await readBody<{
    content?: ResumeContent;
    title?: string;
  }>(event);

  let contentToUpdate: ResumeContent | null = null;
  let titleToUpdate: string | null = null;

  if (body.content !== undefined) {
    const contentValidation = ResumeContentSchema.safeParse(body.content);
    if (!contentValidation.success) {
      throw createError({
        statusCode: 400,
        message: `Invalid resume content: ${contentValidation.error.message}`
      });
    }

    const currentVersionNumber = await resumeVersionRepository.getLatestVersionNumber(resume.id);
    const newVersionNumber = currentVersionNumber + 1;

    await resumeVersionRepository.createVersion({
      resumeId: resume.id,
      content: contentValidation.data,
      versionNumber: newVersionNumber
    });

    const config = useRuntimeConfig();
    const maxVersions = config.resume?.maxVersions || 10;
    await resumeVersionRepository.pruneOldVersions(resume.id, maxVersions);

    contentToUpdate = contentValidation.data;
  }

  if (body.title !== undefined && typeof body.title === 'string') {
    if (body.title.trim().length === 0) {
      throw createError({
        statusCode: 400,
        message: 'Title cannot be empty'
      });
    }
    titleToUpdate = body.title;
  }

  if (!contentToUpdate && !titleToUpdate) {
    return resume;
  }

  let updatedResume = resume;

  if (contentToUpdate) {
    updatedResume =
      (await resumeRepository.updateContent(resume.id, userId, contentToUpdate)) || resume;
  }

  if (titleToUpdate) {
    updatedResume =
      (await resumeRepository.updateTitle(resume.id, userId, titleToUpdate)) || resume;
  }

  return updatedResume;
});
