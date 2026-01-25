import { ResumeContentSchema } from '@int/schema';
import { z } from 'zod';
import { resumeRepository } from '../../data/repositories';

/**
 * PUT /api/resumes/:id
 *
 * Update resume content or title
 * Users can edit the parsed JSON or rename the resume
 *
 * Request body:
 * {
 *   content?: ResumeContent (optional, updated JSON)
 *   title?: string (optional, new title)
 * }
 *
 * Related: T076 (US2)
 */

const UpdateResumeSchema = z
  .object({
    content: ResumeContentSchema.optional(),
    title: z.string().min(1).max(255).optional()
  })
  .refine(
    (data: { content?: unknown; title?: string }) =>
      data.content !== undefined || data.title !== undefined,
    {
      message: 'At least one of content or title must be provided'
    }
  );

export default defineEventHandler(async event => {
  // Require authentication
  const session = await requireUserSession(event);

  // Get resume ID from route params
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Resume ID is required'
    });
  }

  // Parse and validate request body
  const body = await readBody(event);
  const validation = UpdateResumeSchema.safeParse(body);

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: validation.error.errors
    });
  }

  const { content, title } = validation.data;

  // Check if resume exists and belongs to user
  const existingResume = await resumeRepository.findByIdAndUserId(
    id,
    (session.user as { id: string }).id
  );
  if (!existingResume) {
    throw createError({
      statusCode: 404,
      message: 'Resume not found'
    });
  }

  // Update content if provided
  let updatedResume = existingResume;
  if (content) {
    const result = await resumeRepository.updateContent(
      id,
      (session.user as { id: string }).id,
      content
    );
    if (result) {
      updatedResume = result;
    }
  }

  // Update title if provided
  if (title) {
    const result = await resumeRepository.updateTitle(
      id,
      (session.user as { id: string }).id,
      title
    );
    if (result) {
      updatedResume = result;
    }
  }

  return updatedResume;
});
