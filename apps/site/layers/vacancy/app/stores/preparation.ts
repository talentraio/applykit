import type { GenerationScoreDetail } from '@int/schema';
import type {
  VacanciesScoreDetailsResponse,
  VacancyMeta,
  VacancyOverviewGeneration,
  VacancyPreparationResponse
} from '@layer/api/types/vacancies';
import type { GenerateScoreDetailsOptions } from '@site/vacancy/app/infrastructure/generation.api';
import { generationApi } from '@site/vacancy/app/infrastructure/generation.api';
import { vacancyApi } from '@site/vacancy/app/infrastructure/vacancy.api';

const MAX_CACHED_PREPARATION_ITEMS = 20;
const MAX_CACHED_SCORE_DETAILS_ITEMS = 40;

type PreparationCacheItem = VacancyPreparationResponse & {
  vacancyId: string;
  cachedAt: number;
};

type ScoreDetailsCacheItem = VacanciesScoreDetailsResponse & {
  cachedAt: number;
};

const toPreparationCacheItem = (payload: VacancyPreparationResponse): PreparationCacheItem => ({
  ...payload,
  vacancyId: payload.vacancy.id,
  cachedAt: Date.now()
});

const toScoreDetailsCacheItem = (
  payload: VacanciesScoreDetailsResponse
): ScoreDetailsCacheItem => ({
  ...payload,
  cachedAt: Date.now()
});

const resolvePreparationItemByVacancy = (
  items: PreparationCacheItem[],
  vacancyId: string
): PreparationCacheItem | null => {
  const vacancyItems = items.filter(item => item.vacancyId === vacancyId);
  if (vacancyItems.length === 0) return null;

  return vacancyItems.reduce<PreparationCacheItem | null>((latest, current) => {
    if (!latest) return current;
    return current.cachedAt > latest.cachedAt ? current : latest;
  }, vacancyItems[0] ?? null);
};

const resolveLatestScoreDetailsItem = (
  items: ScoreDetailsCacheItem[],
  vacancyId: string,
  generationId?: string
): ScoreDetailsCacheItem | null => {
  const filtered = items.filter(item => {
    if (item.vacancyId !== vacancyId) return false;
    if (generationId && item.generationId !== generationId) return false;
    return true;
  });

  if (filtered.length === 0) return null;

  return filtered.reduce<ScoreDetailsCacheItem | null>((latest, current) => {
    if (!latest) return current;
    return current.cachedAt > latest.cachedAt ? current : latest;
  }, filtered[0] ?? null);
};

export const useVacancyPreparationStore = defineStore('VacancyPreparationStore', {
  state: (): {
    activeVacancyId: string | null;
    activeLatestGenerationId: string | null;
    preparationItems: PreparationCacheItem[];
    scoreDetailsItems: ScoreDetailsCacheItem[];
  } => ({
    activeVacancyId: null,
    activeLatestGenerationId: null,
    preparationItems: [],
    scoreDetailsItems: []
  }),

  getters: {
    getPreparationItems: (state): PreparationCacheItem[] => state.preparationItems,
    getScoreDetailsItems: (state): ScoreDetailsCacheItem[] => state.scoreDetailsItems,
    getActiveLatestGenerationId: (state): string | null => state.activeLatestGenerationId,
    getPreparationItem: (state): PreparationCacheItem | null => {
      if (!state.activeVacancyId) return null;
      return resolvePreparationItemByVacancy(state.preparationItems, state.activeVacancyId);
    },
    getPreparationVacancy(): VacancyMeta | null {
      return this.getPreparationItem?.vacancy ?? null;
    },
    getPreparationLatestGeneration(): VacancyOverviewGeneration | null {
      return this.getPreparationItem?.latestGeneration ?? null;
    },
    getPreparationDetailedScoringEnabled(): boolean {
      return this.getPreparationItem?.detailedScoringEnabled ?? false;
    },
    getPreparationScoreDetails(): GenerationScoreDetail | null {
      return this.getPreparationItem?.scoreDetails ?? null;
    },
    getPreparationScoreDetailsStale(): boolean {
      return this.getPreparationItem?.scoreDetailsStale ?? false;
    },
    getPreparationCanRequestDetails(): boolean {
      return this.getPreparationItem?.canRequestDetails ?? false;
    },
    getPreparationCanRegenerateDetails(): boolean {
      return this.getPreparationItem?.canRegenerateDetails ?? false;
    },
    getLatestScoreDetailsResponse(state): VacanciesScoreDetailsResponse | null {
      if (!state.activeVacancyId) return null;
      const generationId =
        state.activeLatestGenerationId ?? this.getPreparationLatestGeneration?.id;
      const entry = resolveLatestScoreDetailsItem(
        state.scoreDetailsItems,
        state.activeVacancyId,
        generationId
      );

      if (!entry) return null;
      const { cachedAt: _cachedAt, ...payload } = entry;
      return payload;
    }
  },

  actions: {
    _syncLatestGenerationContextFromMeta(vacancyId: string): void {
      const vacancyStore = useVacancyStore();
      const vacancyMeta = vacancyStore.getCurrentVacancyMeta;

      if (vacancyMeta?.id === vacancyId) {
        this.activeLatestGenerationId = vacancyMeta.latestGenerationId;
      }
    },

    _ensureVacancyContext(vacancyId: string, latestGenerationId?: string | null): void {
      if (this.activeVacancyId !== vacancyId) {
        this.activeVacancyId = vacancyId;
      }

      if (typeof latestGenerationId !== 'undefined') {
        this.activeLatestGenerationId = latestGenerationId;
        return;
      }

      this._syncLatestGenerationContextFromMeta(vacancyId);
    },

    _removePreparationByVacancyId(vacancyId: string): void {
      this.preparationItems = this.preparationItems.filter(item => item.vacancyId !== vacancyId);
    },

    _removeScoreDetailsByVacancyId(vacancyId: string): void {
      this.scoreDetailsItems = this.scoreDetailsItems.filter(item => item.vacancyId !== vacancyId);
    },

    _upsertPreparationItem(payload: VacancyPreparationResponse): void {
      const item = toPreparationCacheItem(payload);
      const index = this.preparationItems.findIndex(entry => entry.vacancyId === item.vacancyId);

      if (index !== -1) {
        this.preparationItems[index] = item;
        return;
      }

      this.preparationItems.unshift(item);

      if (this.preparationItems.length > MAX_CACHED_PREPARATION_ITEMS) {
        this.preparationItems = this.preparationItems.slice(0, MAX_CACHED_PREPARATION_ITEMS);
      }
    },

    _appendScoreDetailsItem(payload: VacanciesScoreDetailsResponse): void {
      this.scoreDetailsItems.unshift(toScoreDetailsCacheItem(payload));

      if (this.scoreDetailsItems.length > MAX_CACHED_SCORE_DETAILS_ITEMS) {
        this.scoreDetailsItems = this.scoreDetailsItems.slice(0, MAX_CACHED_SCORE_DETAILS_ITEMS);
      }
    },

    _updatePreparationItemByVacancyId(
      vacancyId: string,
      updater: (item: PreparationCacheItem) => PreparationCacheItem
    ): void {
      const index = this.preparationItems.findIndex(item => item.vacancyId === vacancyId);
      if (index === -1) return;

      const current = this.preparationItems[index];
      if (!current) return;

      this.preparationItems[index] = updater(current);
    },

    setActiveContext(vacancyId: string, latestGenerationId?: string | null): void {
      this._ensureVacancyContext(vacancyId, latestGenerationId);
    },

    setPreparationState(payload: VacancyPreparationResponse): void {
      this._ensureVacancyContext(payload.vacancy.id, payload.latestGeneration?.id ?? null);
      this._upsertPreparationItem(payload);
    },

    resetPreparationState(vacancyId?: string): void {
      const targetVacancyId = vacancyId ?? this.activeVacancyId;

      if (!targetVacancyId) {
        this.activeVacancyId = null;
        this.activeLatestGenerationId = null;
        this.preparationItems = [];
        this.scoreDetailsItems = [];
        return;
      }

      if (this.activeVacancyId === targetVacancyId) {
        this.activeLatestGenerationId = null;
      }

      this._removePreparationByVacancyId(targetVacancyId);
      this._removeScoreDetailsByVacancyId(targetVacancyId);
    },

    clearAfterGeneration(vacancyId?: string): void {
      this.resetPreparationState(vacancyId);
    },

    markPreparationStaleAfterVacancyUpdate(vacancyId?: string): void {
      const targetVacancyId = vacancyId ?? this.activeVacancyId;
      if (!targetVacancyId) return;

      this._updatePreparationItemByVacancyId(targetVacancyId, item => {
        const hasDetails = item.scoreDetails !== null;

        return {
          ...item,
          scoreDetailsStale: hasDetails,
          canRegenerateDetails: hasDetails,
          vacancy: {
            ...item.vacancy,
            canRegenerateScoreDetails: hasDetails
          },
          cachedAt: Date.now()
        };
      });
    },

    async fetchVacancyPreparation(vacancyId: string): Promise<VacancyPreparationResponse> {
      this._ensureVacancyContext(vacancyId);

      try {
        const payload = await vacancyApi.fetchPreparation(vacancyId);
        this.activeLatestGenerationId = payload.latestGeneration?.id ?? null;
        this._upsertPreparationItem(payload);

        if (payload.latestGeneration && payload.scoreDetails) {
          this._appendScoreDetailsItem({
            generationId: payload.latestGeneration.id,
            vacancyId,
            reused: true,
            stale: payload.scoreDetailsStale,
            details: payload.scoreDetails.details
          });
        }

        return payload;
      } catch (err) {
        this._removePreparationByVacancyId(vacancyId);
        this._removeScoreDetailsByVacancyId(vacancyId);
        throw err instanceof Error ? err : new Error('Failed to fetch vacancy preparation');
      }
    },

    async fetchScoreDetails(
      vacancyId: string,
      generationId: string,
      options: GenerateScoreDetailsOptions = {}
    ): Promise<VacanciesScoreDetailsResponse> {
      this._ensureVacancyContext(vacancyId, generationId);

      try {
        const payload = await generationApi.fetchScoreDetails(vacancyId, generationId, options);

        this._appendScoreDetailsItem(payload);
        this._updatePreparationItemByVacancyId(vacancyId, item => {
          if (item.latestGeneration?.id !== generationId) {
            return item;
          }

          const scoreDetails = item.scoreDetails
            ? {
                ...item.scoreDetails,
                details: payload.details,
                updatedAt: new Date()
              }
            : item.scoreDetails;

          const scoreDetailsStale = payload.stale;

          return {
            ...item,
            scoreDetails,
            scoreDetailsStale,
            canRegenerateDetails: scoreDetailsStale ? item.canRegenerateDetails : false,
            vacancy: {
              ...item.vacancy,
              canRegenerateScoreDetails: scoreDetailsStale
                ? item.vacancy.canRegenerateScoreDetails
                : false
            },
            cachedAt: Date.now()
          };
        });

        return payload;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to fetch detailed scoring');
      }
    },

    getCachedScoreDetails(
      vacancyId: string,
      generationId: string
    ): VacanciesScoreDetailsResponse | null {
      const entry = resolveLatestScoreDetailsItem(this.scoreDetailsItems, vacancyId, generationId);
      if (!entry) return null;

      const { cachedAt: _cachedAt, ...payload } = entry;
      return payload;
    },

    $reset(): void {
      this.activeVacancyId = null;
      this.activeLatestGenerationId = null;
      this.preparationItems = [];
      this.scoreDetailsItems = [];
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useVacancyPreparationStore, import.meta.hot));
}
