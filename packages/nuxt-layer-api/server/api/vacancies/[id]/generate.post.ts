import type { Role } from '@int/schema';
import { OPERATION_MAP, VACANCY_STATUS_MAP } from '@int/schema';
import {
  generationRepository,
  resumeRepository,
  vacancyRepository
} from '../../../data/repositories';
import { requireLimit } from '../../../services/limits';
import { generateResumeWithLLM } from '../../../services/llm/generate';
import { requireCompleteProfile } from '../../../services/profile';
import { getEffectiveUserRole } from '../../../utils/session-helpers';
import { logGenerateAdaptation, logGenerateScoring } from '../../../utils/usage';

/**
 * POST /api/vacancies/:id/generate
 *
 * Generate tailored resume for a vacancy
 *
 * Request body (optional):
 * - resumeId?: string (if not provided, uses user's most recent resume)
 * - provider?: 'openai' | 'gemini' (preferred LLM provider)
 *
 * Response: Created Generation object
 *
 * Related: T106 (US5)
 */
export default defineEventHandler(async event => {
  // Require authentication
  const session = await requireUserSession(event);
  const userId = session.user.id;
  const userRole: Role = await getEffectiveUserRole(event);

  // Require complete profile before generation
  await requireCompleteProfile(userId);

  // Get vacancy ID from route params
  const vacancyId = getRouterParam(event, 'id');
  if (!vacancyId) {
    throw createError({
      statusCode: 400,
      message: 'Vacancy ID is required'
    });
  }

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

  if (!vacancy.canGenerateResume) {
    throw createError({
      statusCode: 409,
      message: 'Resume generation is currently unavailable for this vacancy'
    });
  }

  // Check rate limit for generate operation
  await requireLimit(userId, OPERATION_MAP.GENERATE, userRole);

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
        userId,
        role: userRole,
        provider
      }
    );

    // Save generation
    const generation = await generationRepository.create({
      vacancyId,
      resumeId: resume.id,
      content: result.content,
      matchScoreBefore: result.matchScoreBefore,
      matchScoreAfter: result.matchScoreAfter,
      scoreBreakdown: result.scoreBreakdown
    });

    // Log adaptation usage
    await logGenerateAdaptation(
      userId,
      result.adaptation.providerType,
      result.adaptation.tokensUsed,
      result.adaptation.cost
    );

    if (result.scoring) {
      await logGenerateScoring(
        userId,
        result.scoring.providerType,
        result.scoring.tokensUsed,
        result.scoring.cost
      );
    }

    // Lock further generation until explicit unlock conditions are met.
    // Also auto-advance status from 'created' to 'generated' on first generation.
    const updatedVacancy = await vacancyRepository.update(vacancyId, userId, {
      canGenerateResume: false,
      ...(vacancy.status === VACANCY_STATUS_MAP.CREATED
        ? { status: VACANCY_STATUS_MAP.GENERATED }
        : {})
    });

    if (!updatedVacancy) {
      throw new Error('Failed to update vacancy generation availability');
    }

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
