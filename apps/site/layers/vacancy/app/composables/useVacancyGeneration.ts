/**
 * useVacancyGeneration Composable
 *
 * High-level composable for vacancy generation editing.
 * Provides auto-save and undo/redo via shared history.
 *
 * Features:
 * - Auto-save on content changes (via useResumeEditHistory)
 * - Undo/redo via useResumeEditHistory
 * - Reactive computed properties from store
 *
 * Related: T035 (US4)
 */

import type {
  ExportFormat,
  Generation,
  PatchFormatSettingsBody,
  ResumeContent,
  ResumeFormatSettingsAts,
  ResumeFormatSettingsHuman
} from '@int/schema';
import type { VacanciesResumeGeneration } from '@layer/api/types/vacancies';

/**
 * useVacancyGeneration composable options
 */
export type UseVacancyGenerationOptions = {
  /**
   * Enable auto-save on content changes
   * @default true
   */
  autoSave?: boolean;
  /**
   * Auto-save debounce delay in ms
   */
  autoSaveDelay?: number;
};

/**
 * useVacancyGeneration composable return type
 */
export type UseVacancyGenerationReturn = {
  // State (from store)
  generation: ComputedRef<Generation | null>;
  content: ComputedRef<ResumeContent | null>;
  isDirty: ComputedRef<boolean>;

  // Settings (from generation format settings store)
  previewType: ComputedRef<ExportFormat>;
  currentSettings: ComputedRef<ResumeFormatSettingsAts | ResumeFormatSettingsHuman>;
  atsSettings: ComputedRef<ResumeFormatSettingsAts>;
  humanSettings: ComputedRef<ResumeFormatSettingsHuman>;

  // Undo/Redo
  canUndo: ComputedRef<boolean>;
  canRedo: ComputedRef<boolean>;
  historyLength: ComputedRef<number>;

  // Actions
  fetchGeneration: () => Promise<VacanciesResumeGeneration>;
  updateContent: (newContent: ResumeContent) => void;
  updateSettings: (partial: PatchFormatSettingsBody) => void;
  setPreviewType: (type: ExportFormat) => void;
  saveContent: () => Promise<Generation | null>;
  undo: () => void;
  redo: () => void;
  discardChanges: () => Promise<void>;
};

/**
 * useVacancyGeneration composable for vacancy generation editing
 *
 * @param vacancyId - The vacancy ID to fetch/edit generation for
 * @param options - Composable options
 * @returns Generation state and actions
 */
export function useVacancyGeneration(
  vacancyId: string,
  options: UseVacancyGenerationOptions = {}
): UseVacancyGenerationReturn {
  const appConfig = useAppConfig();
  const { autoSave = true, autoSaveDelay = appConfig.resume.autosaveDelay } = options;
  const settingsAutoSaveDelay = 200;

  const store = useVacancyStore();
  const {
    getCurrentGeneration,
    getCurrentGenerationId,
    getDisplayGenerationContent,
    getSavingGeneration
  } = storeToRefs(store);
  const generationFormatSettingsStore = useGenerationFormatSettingsStore();
  const { saveGenerationContent, updateGenerationContent, invalidateGenerationSaves } = store;
  const { getPreviewType, getCurrentSettings, getAtsSettings, getHumanSettings } = storeToRefs(
    generationFormatSettingsStore
  );
  const { setPreviewType } = generationFormatSettingsStore;

  // =========================================
  // Undo/Redo + Auto-save via shared history
  // =========================================

  const { t } = useI18n();
  const toast = useToast();
  const getErrorMessage = (error: unknown): string | undefined => {
    return error instanceof Error && error.message ? error.message : undefined;
  };

  const history = useResumeEditHistory({
    resumeId: () => getCurrentGenerationId.value,
    getContent: () => store.getDisplayGenerationContent,
    getSettings: () => ({
      ats: getAtsSettings.value,
      human: getHumanSettings.value
    }),
    setContent: newContent => store.updateGenerationContent(newContent),
    setSettings: newSettings => generationFormatSettingsStore.setFullSettings(newSettings),
    debounceDelay: autoSaveDelay,
    settingsDebounceDelay: settingsAutoSaveDelay,
    autoSnapshot: autoSave,
    autoSave: autoSave
      ? {
          save: () => store.saveGenerationContent(vacancyId),
          saveSettingsPatch: partial => {
            const generationId = getCurrentGenerationId.value;
            if (!generationId) return Promise.resolve();
            return generationFormatSettingsStore.patchSettings(vacancyId, generationId, partial);
          },
          saveSettingsFull: () => {
            const generationId = getCurrentGenerationId.value;
            if (!generationId) return Promise.resolve();
            return generationFormatSettingsStore.putSettings(vacancyId, generationId);
          },
          isSaving: () => getSavingGeneration.value,
          onError: error => {
            toast.add({
              title: t('vacancy.resume.saveFailed'),
              description: getErrorMessage(error),
              color: 'error',
              icon: 'i-lucide-alert-circle'
            });
          }
        }
      : undefined
  });

  // =========================================
  // Actions
  // =========================================
  /**
   * Fetch generation from server and set as current
   */
  async function fetchGeneration(): Promise<VacanciesResumeGeneration> {
    const payload = await store.fetchLatestGeneration(vacancyId);
    const generation = payload.generation;

    if (!generation || !payload.formatSettings) {
      store.setCurrentGeneration(null);
      generationFormatSettingsStore.resetSettings();
      return payload;
    }

    store.setCurrentGeneration(generation);
    generationFormatSettingsStore.setFullSettings(payload.formatSettings);
    return payload;
  }

  /**
   * Save content to server
   */
  async function saveContent(): Promise<Generation | null> {
    return saveGenerationContent(vacancyId);
  }

  const updateContent = (newContent: ResumeContent): void => {
    updateGenerationContent(newContent);
    history.queueContentAutosave();
  };

  const updateSettings = (partial: PatchFormatSettingsBody): void => {
    generationFormatSettingsStore.updateSettings(partial);
    history.queueSettingsAutosave(partial);
  };

  /**
   * Discard unsaved changes
   */
  async function discardChanges(): Promise<void> {
    history.cancelPendingAutosave();

    invalidateGenerationSaves();

    const restored = history.restoreInitialSnapshot();
    if (restored) {
      const generationId = getCurrentGenerationId.value;
      const results = await Promise.allSettled([
        store.saveGenerationContent(vacancyId),
        generationId
          ? generationFormatSettingsStore.putSettings(vacancyId, generationId)
          : Promise.resolve()
      ]);

      const rejectedResult = results.find(
        (result): result is PromiseRejectedResult => result.status === 'rejected'
      );
      if (rejectedResult) {
        throw rejectedResult.reason;
      }
    } else {
      await store.discardGenerationChanges(vacancyId);
    }

    history.clearHistory();
  }

  return {
    // State (from store)
    generation: getCurrentGeneration,
    content: getDisplayGenerationContent,
    isDirty: history.isDirty,

    // Settings (from generation format settings store)
    previewType: getPreviewType,
    currentSettings: getCurrentSettings,
    atsSettings: getAtsSettings,
    humanSettings: getHumanSettings,

    // Undo/Redo
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    historyLength: history.historyLength,

    // Actions
    fetchGeneration,
    updateContent,
    updateSettings,
    setPreviewType,
    saveContent,
    discardChanges,
    undo: history.undo,
    redo: history.redo
  };
}
