import type { Role } from '@int/schema';
import type { VacancyMeta } from '@layer/api/types/vacancies';
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

/**
 * GET /api/vacancies/:id/meta
 *
 * Get vacancy meta by ID.
 * Only returns the vacancy if it belongs to the current user.
 * Includes score details availability flags for UI button state.
 *
 * Response: VacancyMeta object or 404
 */
export default defineEventHandler(async (event): Promise<VacancyMeta> => {
  const session = await requireUserSession(event);
  const userId = session.user.id;
  const userRole: Role = await getEffectiveUserRole(event);

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Vacancy ID is required'
    });
  }

  const vacancy = await vacancyRepository.findByIdAndUserId(id, userId);
  if (!vacancy) {
    throw createError({
      statusCode: 404,
      message: 'Vacancy not found'
    });
  }

  const [latestGeneration, latestCoverLetter] = await Promise.all([
    generationRepository.findLatestOverviewByVacancyId(id),
    coverLetterRepository.findLatestByVacancyId(id)
  ]);

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

  let canRegenerateScoreDetails = false;

  if (canRequestScoreDetails && latestGeneration) {
    try {
      const scoreDetails = await generationScoreDetailRepository.findByGenerationId(
        latestGeneration.id
      );

      if (scoreDetails) {
        const vacancyVersionMarker = buildVacancyVersionMarker({
          company: vacancy.company,
          jobPosition: vacancy.jobPosition,
          description: vacancy.description
        });
        const stale = scoreDetails.vacancyVersionMarker !== vacancyVersionMarker;
        canRegenerateScoreDetails = stale && vacancy.canGenerateResume;
      }
    } catch (error) {
      if (!isUndefinedTableError(error, 'generation_score_details')) {
        throw error;
      }
    }
  }

  return {
    id: vacancy.id,
    company: vacancy.company,
    jobPosition: vacancy.jobPosition,
    latestGenerationId: latestGeneration?.id ?? null,
    hasCoverLetter: Boolean(latestCoverLetter),
    canRequestScoreDetails,
    canRegenerateScoreDetails,
    coverLetterDraftEnabled,
    coverLetterHighEnabled
  };
});
