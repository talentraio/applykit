import type { Role } from '@int/schema';
import type { VacancyPreparationResponse } from '@layer/api/types/vacancies';
import { LLM_SCENARIO_KEY_MAP, USER_ROLE_MAP } from '@int/schema';
import {
  generationRepository,
  generationScoreDetailRepository,
  vacancyRepository
} from '../../../data/repositories';
import { resolveScenarioModel } from '../../../services/llm';
import { buildVacancyVersionMarker } from '../../../services/vacancy/version-marker';
import { isUndefinedTableError } from '../../../utils/db-errors';

export default defineEventHandler(async (event): Promise<VacancyPreparationResponse> => {
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

  const vacancy = await vacancyRepository.findByIdAndUserId(vacancyId, userId);
  if (!vacancy) {
    throw createError({
      statusCode: 404,
      message: 'Vacancy not found'
    });
  }

  const latestGeneration = await generationRepository.findLatestOverviewByVacancyId(vacancyId);

  let scoreDetails = null;
  if (latestGeneration) {
    try {
      scoreDetails = await generationScoreDetailRepository.findByGenerationId(latestGeneration.id);
    } catch (error) {
      if (!isUndefinedTableError(error, 'generation_score_details')) {
        throw error;
      }

      console.warn(
        'generation_score_details table is unavailable. Returning preparation payload without detailed scoring.'
      );
    }
  }

  const scenarioModel = await resolveScenarioModel(
    userRole,
    LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL
  );
  const hasDetailedScenario = Boolean(scenarioModel);

  const vacancyVersionMarker = buildVacancyVersionMarker({
    company: vacancy.company,
    jobPosition: vacancy.jobPosition,
    description: vacancy.description
  });
  const scoreDetailsStale = Boolean(
    scoreDetails && scoreDetails.vacancyVersionMarker !== vacancyVersionMarker
  );

  return {
    vacancy: {
      id: vacancy.id,
      company: vacancy.company,
      jobPosition: vacancy.jobPosition
    },
    latestGeneration,
    scoreDetails,
    scoreDetailsStale,
    canRequestDetails: Boolean(latestGeneration && (hasDetailedScenario || scoreDetails)),
    canRegenerateDetails: Boolean(
      latestGeneration &&
      scoreDetails &&
      scoreDetailsStale &&
      vacancy.canGenerateResume &&
      hasDetailedScenario
    )
  };
});
