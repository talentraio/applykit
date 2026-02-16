import type { Role } from '@int/schema';
import type { VacancyPreparationResponse } from '@layer/api/types/vacancies';
import { LLM_SCENARIO_KEY_MAP } from '@int/schema';
import {
  generationRepository,
  generationScoreDetailRepository,
  vacancyRepository
} from '../../../data/repositories';
import { resolveScenarioModel } from '../../../services/llm';
import { buildVacancyVersionMarker } from '../../../services/vacancy/version-marker';
import { isUndefinedTableError } from '../../../utils/db-errors';
import { getEffectiveUserRole } from '../../../utils/session-helpers';

export default defineEventHandler(async (event): Promise<VacancyPreparationResponse> => {
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
  const detailedScoringEnabled = Boolean(scenarioModel);

  const vacancyVersionMarker = buildVacancyVersionMarker({
    company: vacancy.company,
    jobPosition: vacancy.jobPosition,
    description: vacancy.description
  });
  const visibleScoreDetails = detailedScoringEnabled ? scoreDetails : null;
  const scoreDetailsStale = Boolean(
    visibleScoreDetails && visibleScoreDetails.vacancyVersionMarker !== vacancyVersionMarker
  );

  return {
    vacancy: {
      id: vacancy.id,
      company: vacancy.company,
      jobPosition: vacancy.jobPosition,
      canRequestScoreDetails: Boolean(latestGeneration && detailedScoringEnabled),
      canRegenerateScoreDetails: Boolean(
        latestGeneration &&
        visibleScoreDetails &&
        scoreDetailsStale &&
        vacancy.canGenerateResume &&
        detailedScoringEnabled
      )
    },
    latestGeneration,
    scoreDetails: visibleScoreDetails,
    detailedScoringEnabled,
    scoreDetailsStale,
    canRequestDetails: Boolean(latestGeneration && detailedScoringEnabled),
    canRegenerateDetails: Boolean(
      latestGeneration &&
      visibleScoreDetails &&
      scoreDetailsStale &&
      vacancy.canGenerateResume &&
      detailedScoringEnabled
    )
  };
});
