import type {
  Generation,
  GenerationScoreDetail,
  GenerationScoreDetailPayload,
  Vacancy
} from '@int/schema';

export type VacancyMeta = Pick<Vacancy, 'id' | 'company' | 'jobPosition'>;

export type VacancyOverviewGeneration = Pick<
  Generation,
  'id' | 'matchScoreBefore' | 'matchScoreAfter' | 'expiresAt'
>;

export type VacancyOverview = {
  vacancy: Vacancy;
  latestGeneration: VacancyOverviewGeneration | null;
  canGenerateResume: boolean;
};

export type VacanciesResumeGeneration = {
  isValid: boolean;
  generation: Generation | null;
};

export type VacanciesScoreDetailsResponse = {
  generationId: string;
  vacancyId: string;
  reused: boolean;
  stale: boolean;
  details: GenerationScoreDetailPayload;
};

export type VacancyPreparationResponse = {
  vacancy: VacancyMeta;
  latestGeneration: VacancyOverviewGeneration | null;
  scoreDetails: GenerationScoreDetail | null;
  detailedScoringEnabled: boolean;
  scoreDetailsStale: boolean;
  canRequestDetails: boolean;
  canRegenerateDetails: boolean;
};
