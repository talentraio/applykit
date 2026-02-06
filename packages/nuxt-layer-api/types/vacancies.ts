import type { Generation } from '@int/schema';

export type VacanciesResumeGeneration = {
  isValid: boolean;
  generation: Generation | null;
};
