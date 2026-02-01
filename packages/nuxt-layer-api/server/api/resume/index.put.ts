import type { ResumeContent, ResumeFormatSettings } from '@int/schema';
import { ResumeContentSchema, ResumeFormatSettingsSchema } from '@int/schema';
import { resumeRepository } from '../../data/repositories';
import { resumeVersionRepository } from '../../data/repositories/resume-version';

/**
 * PUT /api/resume
 *
 * Update current user's resume content and/or formatting settings
 * Automatically creates a version snapshot on content change
 *
 * Request:
 * - Content-Type: application/json
 * - Fields (all optional):
 *   - content: ResumeContent (updates resume content)
 *   - atsSettings: ResumeFormatSettings (updates ATS formatting)
 *   - humanSettings: ResumeFormatSettings (updates Human formatting)
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
 *
 * Related: T012 (US1)
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
    atsSettings?: ResumeFormatSettings;
    humanSettings?: ResumeFormatSettings;
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

  // Validate and update ATS settings if provided
  if (body.atsSettings !== undefined) {
    if (body.atsSettings === null) {
      updateData.atsSettings = null;
    } else {
      const atsValidation = ResumeFormatSettingsSchema.safeParse(body.atsSettings);
      if (!atsValidation.success) {
        throw createError({
          statusCode: 400,
          message: `Invalid ATS settings: ${atsValidation.error.message}`
        });
      }
      updateData.atsSettings = atsValidation.data;
    }
  }

  // Validate and update Human settings if provided
  if (body.humanSettings !== undefined) {
    if (body.humanSettings === null) {
      updateData.humanSettings = null;
    } else {
      const humanValidation = ResumeFormatSettingsSchema.safeParse(body.humanSettings);
      if (!humanValidation.success) {
        throw createError({
          statusCode: 400,
          message: `Invalid Human settings: ${humanValidation.error.message}`
        });
      }
      updateData.humanSettings = humanValidation.data;
    }
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

  if (updateData.atsSettings !== undefined || updateData.humanSettings !== undefined) {
    const settingsUpdate = {
      ...(updateData.atsSettings !== undefined && { atsSettings: updateData.atsSettings }),
      ...(updateData.humanSettings !== undefined && { humanSettings: updateData.humanSettings })
    };

    updatedResume =
      (await resumeRepository.updateSettings(
        resume.id,
        userId,
        settingsUpdate as {
          atsSettings?: ResumeFormatSettings | null;
          humanSettings?: ResumeFormatSettings | null;
        }
      )) || resume;
  }

  if (updateData.title) {
    updatedResume =
      (await resumeRepository.updateTitle(resume.id, userId, updateData.title as string)) || resume;
  }

  return updatedResume;
});
