import type { CoverLetterGenerationSettings, Role } from '@int/schema';
import {
  CoverLetterGenerateBodySchema,
  DefaultCoverLetterFormatSettings,
  normalizeNullableText,
  OPERATION_MAP
} from '@int/schema';
import {
  coverLetterRepository,
  generationRepository,
  vacancyRepository
} from '../../../../data/repositories';
import { requireLimit } from '../../../../services/limits';
import { generateCoverLetterWithLLM } from '../../../../services/llm/cover-letter';
import { getEffectiveUserRole } from '../../../../utils/session-helpers';
import { logGenerate } from '../../../../utils/usage';

/**
 * POST /api/vacancies/:id/cover-letter/generate
 *
 * Generates and stores latest cover letter for vacancy.
 */
export default defineEventHandler(async event => {
  const session = await requireUserSession(event);
  const userId = session.user.id;
  const userRole: Role = await getEffectiveUserRole(event);

  const vacancyId = getRouterParam(event, 'id');
  if (!vacancyId) {
    throw createError({
      statusCode: 400,
      message: 'Vacancy ID is required'
    });
  }

  const vacancy = await vacancyRepository.findByIdAndUserId(vacancyId, userId);
  if (!vacancy) {
    throw createError({
      statusCode: 404,
      message: 'Vacancy not found'
    });
  }

  const latestGeneration = await generationRepository.findLatestByVacancyId(vacancyId);
  if (!latestGeneration) {
    throw createError({
      statusCode: 409,
      message: 'Tailored resume generation is required before cover letter generation'
    });
  }

  await requireLimit(userId, OPERATION_MAP.GENERATE, userRole);

  const body = await readBody(event).catch(() => ({}));
  const validation = CoverLetterGenerateBodySchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation Error',
      data: { issues: validation.error.issues }
    });
  }

  const payload = validation.data;

  const generationSettings: CoverLetterGenerationSettings = {
    language: payload.language,
    type: payload.type,
    tone: payload.tone,
    lengthPreset: payload.lengthPreset,
    recipientName: normalizeNullableText(payload.recipientName),
    includeSubjectLine: payload.type === 'message' ? payload.includeSubjectLine : false,
    instructions: normalizeNullableText(payload.instructions)
  };

  try {
    const result = await generateCoverLetterWithLLM(
      {
        resumeContent: latestGeneration.content,
        vacancy: {
          company: vacancy.company,
          jobPosition: vacancy.jobPosition,
          description: vacancy.description
        },
        settings: generationSettings
      },
      {
        userId,
        role: userRole,
        provider: payload.provider
      }
    );

    await logGenerate(
      userId,
      result.usage.providerType,
      null,
      result.usage.tokensUsed,
      result.usage.cost
    );

    const includeSubjectLine =
      generationSettings.type === 'message' ? generationSettings.includeSubjectLine : false;

    const coverLetter = await coverLetterRepository.upsertLatest({
      vacancyId,
      generationId: latestGeneration.id,
      language: generationSettings.language,
      type: generationSettings.type,
      tone: generationSettings.tone,
      lengthPreset: generationSettings.lengthPreset,
      recipientName: generationSettings.recipientName ?? null,
      includeSubjectLine,
      instructions: generationSettings.instructions ?? null,
      subjectLine: includeSubjectLine ? normalizeNullableText(result.subjectLine) : null,
      contentMarkdown: result.contentMarkdown,
      formatSettings: structuredClone(DefaultCoverLetterFormatSettings)
    });

    return coverLetter;
  } catch (error) {
    if (error instanceof Error) {
      throw createError({
        statusCode: 500,
        message: `Cover letter generation failed: ${error.message}`
      });
    }

    throw createError({
      statusCode: 500,
      message: 'Cover letter generation failed'
    });
  }
});
