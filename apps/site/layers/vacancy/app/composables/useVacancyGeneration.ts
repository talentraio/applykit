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

  // Settings (from format settings store)
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
  fetchSettings: () => Promise<void>;
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
  const { getCurrentGeneration, getDisplayGenerationContent, getSavingGeneration } =
    storeToRefs(store);
  const formatSettingsStore = useFormatSettingsStore();
  const { saveGenerationContent, updateGenerationContent, invalidateGenerationSaves } = store;
  const { getPreviewType, getCurrentSettings, getAtsSettings, getHumanSettings } =
    storeToRefs(formatSettingsStore);
  const { fetchSettings, setPreviewType } = formatSettingsStore;

  // =========================================
  // Undo/Redo + Auto-save via shared history
  // =========================================

  const { t } = useI18n();
  const toast = useToast();
  const getErrorMessage = (error: unknown): string | undefined => {
    return error instanceof Error && error.message ? error.message : undefined;
  };

  const history = useResumeEditHistory({
    resumeId: () => store.currentGenerationId,
    getContent: () => store.getDisplayGenerationContent,
    getSettings: () => ({ ats: formatSettingsStore.ats, human: formatSettingsStore.human }),
    setContent: newContent => store.updateGenerationContent(newContent),
    setSettings: newSettings => formatSettingsStore.setFullSettings(newSettings),
    debounceDelay: autoSaveDelay,
    settingsDebounceDelay: settingsAutoSaveDelay,
    autoSnapshot: autoSave,
    autoSave: autoSave
      ? {
          save: () => store.saveGenerationContent(vacancyId),
          saveSettings: () =>
            formatSettingsStore.patchSettings({
              ats: formatSettingsStore.ats,
              human: formatSettingsStore.human
            }),
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
    if (payload.generation) {
      store.setCurrentGeneration(payload.generation);
    }
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
    formatSettingsStore.updateSettings(partial);
    history.queueSettingsAutosave();
  };

  /**
   * Discard unsaved changes
   */
  async function discardChanges(): Promise<void> {
    history.cancelPendingAutosave();

    invalidateGenerationSaves();

    const restored = history.restoreInitialSnapshot();
    if (restored) {
      const results = await Promise.allSettled([
        store.saveGenerationContent(vacancyId),
        formatSettingsStore.patchSettings({
          ats: formatSettingsStore.ats,
          human: formatSettingsStore.human
        })
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

    // Settings (from format settings store)
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
    fetchSettings,
    updateContent,
    updateSettings,
    setPreviewType,
    saveContent,
    discardChanges,
    undo: history.undo,
    redo: history.redo
  };
}
