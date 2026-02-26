import type {
  Generation,
  Vacancy,
  VacancyInput,
  VacancyListColumnVisibility,
  VacancyListQuery,
  VacancyListResponse,
  VacancyStatus
} from '@int/schema';
import type {
  VacancyMeta,
  VacancyOverview,
  VacancyOverviewGeneration
} from '@layer/api/types/vacancies';
import type { Pinia, Store } from 'pinia';
import { vacancyApi } from '@site/vacancy/app/infrastructure/vacancy.api';
import { getActivePinia } from 'pinia';

/**
 * Vacancy Store
 *
 * Manages vacancy entities and list/meta operations.
 */

const toOverviewGeneration = (generation: Generation | null): VacancyOverviewGeneration | null => {
  if (!generation) return null;

  return {
    id: generation.id,
    matchScoreBefore: generation.matchScoreBefore,
    matchScoreAfter: generation.matchScoreAfter,
    expiresAt: generation.expiresAt
  };
};

type ExtendedPinia = {
  _s: Map<string, Store>;
} & Pinia;

const resetStoresByPrefix = (prefix: string, excludedStoreId: string): void => {
  const pinia = getActivePinia() as ExtendedPinia | undefined;

  if (!pinia) {
    throw new Error('There is no stores');
  }

  pinia._s.forEach((store, storeId) => {
    if (!storeId.startsWith(prefix) || storeId === excludedStoreId) {
      return;
    }

    store.$reset();
  });
};

export const useVacancyStore = defineStore('VacancyStore', {
  state: (): {
    vacancyListResponse: VacancyListResponse | null;
    currentVacancyMeta: VacancyMeta | null;
    currentVacancy: Vacancy | null;
    overviewLatestGeneration: VacancyOverviewGeneration | null;
    overviewCanGenerateResume: boolean;
    loading: boolean;
  } => ({
    vacancyListResponse: null,
    currentVacancyMeta: null,
    currentVacancy: null,
    overviewLatestGeneration: null,
    overviewCanGenerateResume: false,
    loading: false
  }),

  getters: {
    vacancies: (state): Vacancy[] => state.vacancyListResponse?.items ?? [],
    totalItems: (state): number => state.vacancyListResponse?.pagination.totalItems ?? 0,
    totalPages: (state): number => state.vacancyListResponse?.pagination.totalPages ?? 0,

    getColumnVisibility: (state): VacancyListColumnVisibility | null =>
      state.vacancyListResponse?.columnVisibility ?? null,

    getCurrentVacancyMeta: (state): VacancyMeta | null => state.currentVacancyMeta,
    getCurrentVacancy: (state): Vacancy | null => state.currentVacancy,
    getOverviewLatestGeneration: (state): VacancyOverviewGeneration | null =>
      state.overviewLatestGeneration,
    getCanGenerateResume: (state): boolean => state.overviewCanGenerateResume,

    getHasVacancies(): boolean {
      return this.vacancies.length > 0;
    },

    getLatestVacancy(): Vacancy | null {
      if (this.vacancies.length === 0) return null;

      const sorted = [...this.vacancies].sort(
        (first, second) =>
          new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
      );

      return sorted[0] ?? null;
    }
  },

  actions: {
    setCurrentVacancyMetaFromOverview(overview: VacancyOverview): void {
      const latestGenerationId = overview.latestGeneration?.id ?? null;
      const hasSameVacancyMeta = this.currentVacancyMeta?.id === overview.vacancy.id;

      this.currentVacancyMeta = {
        id: overview.vacancy.id,
        company: overview.vacancy.company,
        jobPosition: overview.vacancy.jobPosition,
        latestGenerationId,
        hasCoverLetter: overview.hasCoverLetter,
        canRequestScoreDetails: hasSameVacancyMeta
          ? (this.currentVacancyMeta?.canRequestScoreDetails ?? false)
          : false,
        canRegenerateScoreDetails: hasSameVacancyMeta
          ? (this.currentVacancyMeta?.canRegenerateScoreDetails ?? false)
          : false,
        coverLetterDraftEnabled: hasSameVacancyMeta
          ? (this.currentVacancyMeta?.coverLetterDraftEnabled ?? true)
          : true,
        coverLetterHighEnabled: hasSameVacancyMeta
          ? (this.currentVacancyMeta?.coverLetterHighEnabled ?? true)
          : true
      };
    },

    setOverviewState(
      latestGeneration: VacancyOverviewGeneration | null,
      canGenerateResume: boolean
    ): void {
      this.overviewLatestGeneration = latestGeneration;
      this.overviewCanGenerateResume = canGenerateResume;
    },

    resetOverviewState(): void {
      this.overviewLatestGeneration = null;
      this.overviewCanGenerateResume = false;
    },

    markResumeGenerated(vacancyId: string, generation: Generation): void {
      this.setOverviewState(toOverviewGeneration(generation), false);

      if (this.currentVacancyMeta?.id === vacancyId) {
        this.currentVacancyMeta = {
          ...this.currentVacancyMeta,
          latestGenerationId: generation.id
        };
      }
    },

    markCoverLetterGenerated(vacancyId: string): void {
      if (this.currentVacancyMeta?.id !== vacancyId) return;

      this.currentVacancyMeta = {
        ...this.currentVacancyMeta,
        hasCoverLetter: true
      };
    },

    async fetchVacancyMeta(id: string): Promise<VacancyMeta> {
      const meta = await vacancyApi.fetchMeta(id);
      this.currentVacancyMeta = meta;
      return meta;
    },

    async fetchVacanciesPaginated(query: VacancyListQuery): Promise<VacancyListResponse> {
      this.loading = true;

      try {
        const data = await vacancyApi.fetchPaginated(query);
        this.vacancyListResponse = data;
        return data;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to fetch vacancies');
      } finally {
        this.loading = false;
      }
    },

    async fetchVacancyOverview(id: string): Promise<VacancyOverview | null> {
      this.loading = true;

      try {
        const overview = await vacancyApi.fetchOverview(id);
        this.currentVacancy = overview.vacancy;
        this.setOverviewState(overview.latestGeneration, overview.canGenerateResume);
        this.setCurrentVacancyMetaFromOverview(overview);
        return overview;
      } catch (err) {
        this.currentVacancy = null;
        this.resetOverviewState();
        throw err instanceof Error ? err : new Error('Failed to fetch vacancy overview');
      } finally {
        this.loading = false;
      }
    },

    async createVacancy(data: VacancyInput): Promise<Vacancy> {
      this.loading = true;

      try {
        const vacancy = await vacancyApi.create(data);
        this.currentVacancy = vacancy;
        this.setOverviewState(null, true);
        this.currentVacancyMeta = {
          id: vacancy.id,
          company: vacancy.company,
          jobPosition: vacancy.jobPosition,
          latestGenerationId: null,
          hasCoverLetter: false,
          canRequestScoreDetails: false,
          canRegenerateScoreDetails: false,
          coverLetterDraftEnabled: true,
          coverLetterHighEnabled: true
        };
        return vacancy;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to create vacancy');
      } finally {
        this.loading = false;
      }
    },

    async updateVacancy(id: string, data: Partial<VacancyInput>): Promise<Vacancy> {
      this.loading = true;

      try {
        const vacancy = await vacancyApi.update(id, data);

        if (this.currentVacancy?.id === id) {
          const hasCompanyChanged =
            data.company !== undefined && data.company !== this.currentVacancy.company;
          const hasJobPositionChanged =
            data.jobPosition !== undefined &&
            (data.jobPosition ?? null) !== (this.currentVacancy.jobPosition ?? null);
          const hasDescriptionChanged =
            data.description !== undefined && data.description !== this.currentVacancy.description;

          this.currentVacancy = vacancy;
          if (this.currentVacancyMeta?.id === id) {
            this.currentVacancyMeta = {
              ...this.currentVacancyMeta,
              company: vacancy.company,
              jobPosition: vacancy.jobPosition
            };
          }

          if (hasCompanyChanged || hasJobPositionChanged || hasDescriptionChanged) {
            this.overviewCanGenerateResume = true;
          }
        }

        return vacancy;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to update vacancy');
      } finally {
        this.loading = false;
      }
    },

    async updateVacancyStatus(status: VacancyStatus): Promise<void> {
      if (!this.currentVacancy) return;
      await this.updateVacancy(this.currentVacancy.id, { status });
    },

    async deleteVacancy(id: string): Promise<void> {
      this.loading = true;

      try {
        await vacancyApi.delete(id);

        if (this.currentVacancy?.id === id) {
          this.currentVacancy = null;
          this.currentVacancyMeta = null;
          this.resetOverviewState();
        }
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to delete vacancy');
      } finally {
        this.loading = false;
      }
    },

    async bulkDeleteVacancies(ids: string[]): Promise<void> {
      this.loading = true;

      try {
        await vacancyApi.bulkDelete(ids);
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to bulk delete vacancies');
      } finally {
        this.loading = false;
      }
    },

    async updateColumnVisibility(columnVisibility: VacancyListColumnVisibility): Promise<void> {
      try {
        const result = await vacancyApi.updateColumnVisibility(columnVisibility);

        if (this.vacancyListResponse) {
          this.vacancyListResponse.columnVisibility = result.columnVisibility;
        }
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to update column visibility');
      }
    },

    $reset(): void {
      resetStoresByPrefix('Vacancy', 'VacancyStore');

      this.vacancyListResponse = null;
      this.currentVacancyMeta = null;
      this.currentVacancy = null;
      this.overviewLatestGeneration = null;
      this.overviewCanGenerateResume = false;
      this.loading = false;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useVacancyStore, import.meta.hot));
}
