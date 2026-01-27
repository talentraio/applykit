import type { Role } from '@int/schema';
import { OPERATION_MAP, PROVIDER_TYPE_MAP, USER_ROLE_MAP } from '@int/schema';
import {
  generationRepository,
  resumeRepository,
  vacancyRepository
} from '../../../data/repositories';
import { requireLimit } from '../../../services/limits';
import { generateResumeWithLLM } from '../../../services/llm/generate';
import { logGenerate } from '../../../utils/usage';

/**
 * POST /api/vacancies/:id/generate
 *
 * Generate tailored resume for a vacancy
 *
 * Request body (optional):
 * - resumeId?: string (if not provided, uses user's most recent resume)
 * - provider?: 'openai' | 'gemini' (preferred LLM provider)
 *
 * Request headers:
 * - x-api-key?: string (BYOK key for LLM provider)
 *
 * Response: Created Generation object
 *
 * Related: T106 (US5)
 */
export default defineEventHandler(async event => {
  // Require authentication
  const session = await requireUserSession(event);
  const userId = session.user.id;
  const userRole: Role = session.user.role ?? USER_ROLE_MAP.PUBLIC;

  // Get vacancy ID from route params
  const vacancyId = getRouterParam(event, 'id');
  if (!vacancyId) {
    throw createError({
      statusCode: 400,
      message: 'Vacancy ID is required'
    });
  }

  // Check rate limit for generate operation
  await requireLimit(userId, OPERATION_MAP.GENERATE, userRole);

  // Verify vacancy belongs to user
  const vacancy = await vacancyRepository.findById(vacancyId);
  if (!vacancy) {
    throw createError({
      statusCode: 404,
      message: 'Vacancy not found'
    });
  }

  if (vacancy.userId !== userId) {
    throw createError({
      statusCode: 403,
      message: 'Access denied'
    });
  }

  // Read request body
  const body = await readBody(event).catch(() => ({}));
  const { resumeId, provider } = body;

  // Get resume
  let resume;
  if (resumeId) {
    // Use specified resume
    resume = await resumeRepository.findById(resumeId);
    if (!resume) {
      throw createError({
        statusCode: 404,
        message: 'Resume not found'
      });
    }
    if (resume.userId !== userId) {
      throw createError({
        statusCode: 403,
        message: 'Access denied to resume'
      });
    }
  } else {
    // Use most recent resume
    const resumes = await resumeRepository.findByUserId(userId);
    if (resumes.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'No resumes found. Please upload a resume first.'
      });
    }
    resume = resumes[0]; // Repository returns ordered by updatedAt DESC
  }

  // At this point, resume is guaranteed to be defined (all error paths throw)
  if (!resume) {
    // This should never happen, but satisfies TypeScript
    throw createError({
      statusCode: 500,
      message: 'Failed to load resume'
    });
  }

  // Get BYOK key from header (if provided)
  const userApiKey = getHeader(event, 'x-api-key');

  try {
    // Generate tailored resume
    // Note: Profile context (preferredJobTitle, etc.) will be added in a future iteration
    const result = await generateResumeWithLLM(
      resume.content,
      {
        company: vacancy.company,
        jobPosition: vacancy.jobPosition,
        description: vacancy.description
      },
      undefined, // Profile context not used in MVP
      {
        userApiKey,
        provider
      }
    );

    // Save generation
    const generation = await generationRepository.create({
      vacancyId,
      resumeId: resume.id,
      content: result.content,
      matchScoreBefore: result.matchScoreBefore,
      matchScoreAfter: result.matchScoreAfter
    });

    // Log usage
    await logGenerate(
      userId,
      userApiKey ? PROVIDER_TYPE_MAP.BYOK : PROVIDER_TYPE_MAP.PLATFORM,
      result.tokensUsed,
      result.cost
    );

    return generation;
  } catch (error) {
    console.error('Generation error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      throw createError({
        statusCode: 500,
        message: `Resume generation failed: ${error.message}`
      });
    }

    throw createError({
      statusCode: 500,
      message: 'Resume generation failed'
    });
  }
});
