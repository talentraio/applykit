import type { Role } from '@int/schema';
import type { VacanciesScoreDetailsResponse } from '@layer/api/types/vacancies';
import { LLM_SCENARIO_KEY_MAP, OPERATION_MAP, USER_ROLE_MAP } from '@int/schema';
import {
  generationRepository,
  generationScoreDetailRepository,
  resumeRepository,
  vacancyRepository
} from '../../../../../data/repositories';
import { requireLimit } from '../../../../../services/limits';
import { resolveScenarioModel } from '../../../../../services/llm';
import { generateScoreDetailsWithLLM } from '../../../../../services/llm/score-details';
import { buildVacancyVersionMarker } from '../../../../../services/vacancy/version-marker';
import { isUndefinedTableError } from '../../../../../utils/db-errors';
import { logGenerateDetailedScoring } from '../../../../../utils/usage';

const toBooleanQuery = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }

  return false;
};

export default defineEventHandler(async (event): Promise<VacanciesScoreDetailsResponse> => {
  const session = await requireUserSession(event);
  const userId = session.user.id;
  const userRole: Role = session.user.role ?? USER_ROLE_MAP.PUBLIC;

  const vacancyId = getRouterParam(event, 'id');
  if (!vacancyId) {
    throw createError({
      statusCode: 400,
      message: 'Vacancy ID is required'
    });
  }

  const generationId = getRouterParam(event, 'generationId');
  if (!generationId) {
    throw createError({
      statusCode: 400,
      message: 'Generation ID is required'
    });
  }

  const query = getQuery(event);
  const regenerate = toBooleanQuery(query.regenerate);

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

  const generation = await generationRepository.findById(generationId);
  if (!generation || generation.vacancyId !== vacancyId) {
    throw createError({
      statusCode: 404,
      message: 'Generation not found'
    });
  }

  if (generation.expiresAt.getTime() < Date.now()) {
    throw createError({
      statusCode: 404,
      message: 'Generation expired'
    });
  }

  const vacancyVersionMarker = buildVacancyVersionMarker({
    company: vacancy.company,
    jobPosition: vacancy.jobPosition,
    description: vacancy.description
  });

  let persistenceAvailable = true;
  let existingDetails = null;

  try {
    existingDetails = await generationScoreDetailRepository.findByVacancyAndGeneration(
      vacancyId,
      generationId
    );
  } catch (error) {
    if (!isUndefinedTableError(error, 'generation_score_details')) {
      throw error;
    }

    persistenceAvailable = false;
    console.warn(
      'generation_score_details table is unavailable. Detailed scoring will run without persistence.'
    );
  }

  const stale = Boolean(
    existingDetails && existingDetails.vacancyVersionMarker !== vacancyVersionMarker
  );

  if (!regenerate && existingDetails) {
    return {
      generationId,
      vacancyId,
      reused: true,
      stale,
      details: existingDetails.details
    };
  }

  if (regenerate) {
    if (!existingDetails) {
      throw createError({
        statusCode: 400,
        message: 'No existing detailed scoring to regenerate'
      });
    }

    if (!vacancy.canGenerateResume || !stale) {
      throw createError({
        statusCode: 400,
        message: 'Detailed scoring regeneration is not available'
      });
    }
  }

  const canResolveScenario = await resolveScenarioModel(
    userRole,
    LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL
  );
  if (!canResolveScenario) {
    throw createError({
      statusCode: 409,
      message: 'Detailed scoring scenario is not configured'
    });
  }

  await requireLimit(userId, OPERATION_MAP.GENERATE, userRole);

  const baseResume = await resumeRepository.findById(generation.resumeId);
  if (!baseResume || baseResume.userId !== userId) {
    throw createError({
      statusCode: 404,
      message: 'Base resume not found'
    });
  }

  const result = await generateScoreDetailsWithLLM(
    baseResume.content,
    generation.content,
    {
      company: vacancy.company,
      jobPosition: vacancy.jobPosition,
      description: vacancy.description
    },
    undefined,
    {
      userId,
      role: userRole
    }
  );

  let persistedDetails = result.details;

  if (persistenceAvailable) {
    try {
      const persisted = await generationScoreDetailRepository.upsertByGeneration({
        generationId,
        vacancyId,
        vacancyVersionMarker,
        details: result.details,
        provider: result.provider,
        model: result.model,
        strategyKey: result.strategyKey
      });

      persistedDetails = persisted.details;
    } catch (error) {
      if (!isUndefinedTableError(error, 'generation_score_details')) {
        throw error;
      }

      console.warn(
        'generation_score_details table is unavailable during upsert. Returning non-persisted detailed scoring response.'
      );
      persistenceAvailable = false;
    }
  }

  await logGenerateDetailedScoring(
    userId,
    result.usage.providerType,
    result.usage.tokensUsed,
    result.usage.cost
  );

  return {
    generationId,
    vacancyId,
    reused: false,
    stale: false,
    details: persistedDetails
  };
});
