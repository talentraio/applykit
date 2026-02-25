import type { CoverLetterGenerationSettings, LlmScenarioKey, Role } from '@int/schema';
import {
  CoverLetterGenerateBodySchema,
  DefaultCoverLetterFormatSettings,
  LLM_SCENARIO_KEY_MAP,
  normalizeNullableText,
  OPERATION_MAP
} from '@int/schema';
import {
  coverLetterRepository,
  generationRepository,
  vacancyRepository
} from '../../../../data/repositories';
import { requireLimit } from '../../../../services/limits';
import {
  CoverLetterGenerationError,
  generateCoverLetterWithLLM
} from '../../../../services/llm/cover-letter';
import { resolveScenarioModel } from '../../../../services/llm/routing';
import {
  getAdditionalInstructionsValidationMessage,
  getCharacterLimitValidationMessage,
  resolveCoverLetterAdditionalInstructionsMaxCharacters,
  resolveCoverLetterCharacterBufferConfig,
  resolveCoverLetterCharacterLimits,
  toAdditionalInstructionsIssue,
  toCharacterLimitIssue
} from '../../../../services/vacancy/cover-letter-character-limits';
import { resolveCoverLetterHumanizerConfig } from '../../../../services/vacancy/cover-letter-humanizer';
import { getEffectiveUserRole } from '../../../../utils/session-helpers';
import { logGenerate } from '../../../../utils/usage';

type CoverLetterValidationDetails = {
  issues: string[];
};

const isCoverLetterValidationDetails = (value: unknown): value is CoverLetterValidationDetails => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const issues = Reflect.get(value, 'issues');
  return Array.isArray(issues) && issues.every(issue => typeof issue === 'string');
};

const resolveCoverLetterFlowScenarioKey = (
  qualityMode: CoverLetterGenerationSettings['qualityMode']
): LlmScenarioKey => {
  if (qualityMode === 'draft') {
    return LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION_DRAFT;
  }

  return LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION;
};

/**
 * POST /api/vacancies/:id/cover-letter/generate
 *
 * Generates and stores a new cover letter version for vacancy.
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
    market: payload.market,
    grammaticalGender: payload.grammaticalGender,
    qualityMode: payload.qualityMode,
    type: payload.type,
    tone: payload.tone,
    lengthPreset: payload.lengthPreset,
    characterLimit: payload.characterLimit,
    recipientName: normalizeNullableText(payload.recipientName),
    includeSubjectLine: payload.type === 'message' ? payload.includeSubjectLine : false,
    instructions: normalizeNullableText(payload.instructions)
  };
  const runtimeConfig = useRuntimeConfig(event);
  const characterLimits = resolveCoverLetterCharacterLimits(runtimeConfig);
  const additionalInstructionsMaxCharacters =
    resolveCoverLetterAdditionalInstructionsMaxCharacters(runtimeConfig);
  const characterBufferConfig = resolveCoverLetterCharacterBufferConfig(runtimeConfig);
  const runtimeHumanizerConfig = resolveCoverLetterHumanizerConfig(runtimeConfig);
  const characterLimitValidationMessage = getCharacterLimitValidationMessage(
    generationSettings,
    characterLimits
  );

  if (characterLimitValidationMessage) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation Error',
      data: { issues: [toCharacterLimitIssue(characterLimitValidationMessage)] }
    });
  }

  const additionalInstructionsValidationMessage = getAdditionalInstructionsValidationMessage(
    generationSettings,
    additionalInstructionsMaxCharacters
  );

  if (additionalInstructionsValidationMessage) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation Error',
      data: { issues: [toAdditionalInstructionsIssue(additionalInstructionsValidationMessage)] }
    });
  }

  const flowScenarioKey = resolveCoverLetterFlowScenarioKey(generationSettings.qualityMode);
  const flowScenario = await resolveScenarioModel(userRole, flowScenarioKey);
  if (!flowScenario) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Service Unavailable',
      message: 'Selected cover letter flow is disabled or not configured'
    });
  }

  const criticScenario = await resolveScenarioModel(
    userRole,
    LLM_SCENARIO_KEY_MAP.COVER_LETTER_HUMANIZER_CRITIC
  );
  const shouldUseHumanizer =
    generationSettings.qualityMode === 'high' &&
    Boolean(criticScenario) &&
    runtimeHumanizerConfig.maxRewritePasses > 0;

  const humanizerConfig =
    shouldUseHumanizer && criticScenario
      ? {
          ...runtimeHumanizerConfig,
          provider: criticScenario.primary.provider,
          model: criticScenario.primary.model
        }
      : undefined;

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
        provider: payload.provider,
        scenarioKey: flowScenarioKey,
        characterBufferConfig,
        humanizerConfig
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

    const coverLetter = await coverLetterRepository.create({
      vacancyId,
      generationId: latestGeneration.id,
      language: generationSettings.language,
      market: generationSettings.market,
      qualityMode: generationSettings.qualityMode,
      grammaticalGender: generationSettings.grammaticalGender,
      type: generationSettings.type,
      tone: generationSettings.tone,
      lengthPreset: generationSettings.lengthPreset,
      characterLimit: generationSettings.characterLimit,
      recipientName: generationSettings.recipientName ?? null,
      includeSubjectLine,
      instructions: generationSettings.instructions ?? null,
      subjectLine: includeSubjectLine ? normalizeNullableText(result.subjectLine) : null,
      contentMarkdown: result.contentMarkdown,
      formatSettings: structuredClone(DefaultCoverLetterFormatSettings)
    });

    return coverLetter;
  } catch (error) {
    if (error instanceof CoverLetterGenerationError) {
      if (error.code === 'VALIDATION_FAILED') {
        const issues = isCoverLetterValidationDetails(error.details)
          ? error.details.issues
          : [error.message];

        throw createError({
          statusCode: 502,
          statusMessage: 'Bad Gateway',
          message: 'Cover letter generation did not meet output constraints',
          data: {
            issues: issues.map(message => ({
              code: 'custom',
              path: ['contentMarkdown'],
              message
            }))
          }
        });
      }

      if (error.code === 'INVALID_JSON') {
        throw createError({
          statusCode: 502,
          statusMessage: 'Bad Gateway',
          message: 'Cover letter generation returned invalid model response'
        });
      }

      throw createError({
        statusCode: 500,
        message: `Cover letter generation failed: ${error.message}`
      });
    }

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
