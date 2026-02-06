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

import type { Generation, ResumeContent } from '@int/schema';
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
  loading: ComputedRef<boolean>;
  saving: ComputedRef<boolean>;
  error: ComputedRef<Error | null>;
  isDirty: ComputedRef<boolean>;

  // Undo/Redo
  canUndo: ComputedRef<boolean>;
  canRedo: ComputedRef<boolean>;
  historyLength: ComputedRef<number>;

  // Actions
  fetchGeneration: () => Promise<VacanciesResumeGeneration>;
  updateContent: (newContent: ResumeContent) => void;
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

  const store = useVacancyStore();

  // =========================================
  // Computed refs from store
  // =========================================

  const generation = computed(() => store.currentGeneration);
  const content = computed(() => store.displayGenerationContent);
  const loading = computed(() => store.generationLoading);
  const saving = computed(() => store.savingGeneration);
  const error = computed(() => store.error);

  // =========================================
  // Undo/Redo + Auto-save via shared history
  // =========================================

  const { t } = useI18n();
  const toast = useToast();

  const history = useResumeEditHistory({
    resumeId: () => store.currentGenerationId,
    getContent: () => store.displayGenerationContent,
    getSettings: () => store.currentSettings,
    setContent: newContent => store.updateGenerationContent(newContent),
    setSettings: newSettings => store.updateSettings(newSettings),
    debounceDelay: autoSaveDelay,
    autoSnapshot: autoSave,
    autoSave: autoSave
      ? {
          save: () => store.saveGenerationContent(vacancyId),
          isSaving: () => store.savingGeneration,
          onError: () => {
            toast.add({
              title: t('vacancy.resume.saveFailed'),
              description: store.error?.message,
              color: 'error',
              icon: 'i-lucide-alert-circle'
            });
          }
        }
      : undefined
  });

  const canUndo = history.canUndo;
  const canRedo = history.canRedo;
  const historyLength = history.historyLength;

  // isDirty is true if there are history entries (changes have been made)
  const isDirty = computed(() => history.historyLength.value > 1);

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
   * Update content (local state via store)
   */
  function updateContent(newContent: ResumeContent): void {
    store.updateGenerationContent(newContent);
  }

  /**
   * Save content to server
   */
  async function saveContent(): Promise<Generation | null> {
    return store.saveGenerationContent(vacancyId);
  }

  /**
   * Undo last change
   */
  function undo(): void {
    history.undo();
  }

  /**
   * Redo undone change
   */
  function redo(): void {
    history.redo();
  }

  /**
   * Discard unsaved changes
   */
  async function discardChanges(): Promise<void> {
    await store.discardGenerationChanges(vacancyId);
    history.clearHistory();
  }

  return {
    // State (from store)
    generation,
    content,
    loading,
    saving,
    error,
    isDirty,

    // Undo/Redo
    canUndo,
    canRedo,
    historyLength,

    // Actions
    fetchGeneration,
    updateContent,
    saveContent,
    undo,
    redo,
    discardChanges
  };
}
