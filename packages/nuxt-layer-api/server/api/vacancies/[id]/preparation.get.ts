import type { Role } from '@int/schema';
import type { VacancyPreparationResponse } from '@layer/api/types/vacancies';
import { LLM_SCENARIO_KEY_MAP } from '@int/schema';
import {
  coverLetterRepository,
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

  const [latestGeneration, latestCoverLetter] = await Promise.all([
    generationRepository.findLatestOverviewByVacancyId(vacancyId),
    coverLetterRepository.findLatestByVacancyId(vacancyId)
  ]);

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
  const canRequestScoreDetails = Boolean(latestGeneration && scenarioModel);
  const [coverLetterDraftScenarioModel, coverLetterHighScenarioModel] = await Promise.all([
    resolveScenarioModel(userRole, LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION_DRAFT),
    resolveScenarioModel(userRole, LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION)
  ]);
  const coverLetterDraftEnabled = Boolean(coverLetterDraftScenarioModel);
  const coverLetterHighEnabled = Boolean(coverLetterHighScenarioModel);

  const vacancyVersionMarker = buildVacancyVersionMarker({
    company: vacancy.company,
    jobPosition: vacancy.jobPosition,
    description: vacancy.description
  });
  const visibleScoreDetails = canRequestScoreDetails ? scoreDetails : null;
  const scoreDetailsStale = Boolean(
    visibleScoreDetails && visibleScoreDetails.vacancyVersionMarker !== vacancyVersionMarker
  );
  const canRegenerateScoreDetails = Boolean(
    latestGeneration &&
    visibleScoreDetails &&
    scoreDetailsStale &&
    vacancy.canGenerateResume &&
    canRequestScoreDetails
  );

  return {
    vacancy: {
      id: vacancy.id,
      company: vacancy.company,
      jobPosition: vacancy.jobPosition,
      latestGenerationId: latestGeneration?.id ?? null,
      hasCoverLetter: Boolean(latestCoverLetter),
      canRequestScoreDetails,
      canRegenerateScoreDetails,
      coverLetterDraftEnabled,
      coverLetterHighEnabled
    },
    latestGeneration,
    scoreDetails: visibleScoreDetails,
    scoreDetailsStale,
    canRequestDetails: canRequestScoreDetails,
    canRegenerateDetails: canRegenerateScoreDetails
  };
});
