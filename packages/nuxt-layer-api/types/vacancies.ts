import type { Generation, Vacancy } from '@int/schema';

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
