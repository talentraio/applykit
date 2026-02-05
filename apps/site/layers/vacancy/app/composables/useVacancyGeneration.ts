/**
 * useVacancyGeneration Composable
 *
 * High-level composable for editing generation content with auto-save.
 * Similar to useResume but for vacancy generation editing.
 *
 * Features:
 * - Auto-save on content changes (debounced)
 * - Reactive computed properties
 * - Loading/saving state management
 * - Toast notifications for save status
 * - Undo/redo with useRefHistory
 *
 * Related: T035 (US4)
 */

import type { Generation, ResumeContent } from '@int/schema';
import { ResumeContentSchema } from '@int/schema';
import { useRefHistory, watchDebounced } from '@vueuse/core';

/**
 * Auto-save debounce delay in milliseconds
 */
const AUTO_SAVE_DELAY = 2000;

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
   * @default 2000
   */
  autoSaveDelay?: number;
};

/**
 * useVacancyGeneration composable return type
 */
export type UseVacancyGenerationReturn = {
  // State
  generation: Ref<Generation | null>;
  content: Ref<ResumeContent | null>;
  loading: Ref<boolean>;
  saving: Ref<boolean>;
  error: Ref<Error | null>;
  isDirty: Ref<boolean>;

  // Undo/Redo
  canUndo: Ref<boolean>;
  canRedo: Ref<boolean>;
  historyLength: ComputedRef<number>;

  // Actions
  fetchGeneration: () => Promise<void>;
  updateContent: (newContent: ResumeContent) => void;
  saveContent: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  discardChanges: () => void;
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
  const { autoSave = true, autoSaveDelay = AUTO_SAVE_DELAY } = options;

  const { t } = useI18n();
  const toast = useToast();
  const { getLatestGeneration } = useGenerations();

  // =========================================
  // State
  // =========================================

  const generation = ref<Generation | null>(null);
  const originalContent = ref<ResumeContent | null>(null);
  const content = ref<ResumeContent | null>(null);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<Error | null>(null);

  // =========================================
  // Undo/Redo with useRefHistory
  // =========================================

  const {
    history,
    undo: undoHistory,
    redo: redoHistory,
    canUndo,
    canRedo
  } = useRefHistory(content, {
    deep: true,
    capacity: 50
  });

  const historyLength = computed(() => history.value.length);

  // =========================================
  // Computed
  // =========================================

  const isDirty = computed(() => {
    if (!content.value || !originalContent.value) return false;
    return JSON.stringify(content.value) !== JSON.stringify(originalContent.value);
  });

  // =========================================
  // Actions
  // =========================================

  /**
   * Fetch generation from server
   */
  async function fetchGeneration() {
    loading.value = true;
    error.value = null;

    try {
      const gen = await getLatestGeneration(vacancyId);
      generation.value = gen;

      if (gen) {
        content.value = structuredClone(gen.content);
        originalContent.value = structuredClone(gen.content);
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to fetch generation');
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update content (local state)
   */
  function updateContent(newContent: ResumeContent) {
    content.value = newContent;
  }

  /**
   * Save content to server
   */
  async function saveContent() {
    if (!generation.value || !content.value) return;

    // Validate content before saving
    const validation = ResumeContentSchema.safeParse(content.value);
    if (!validation.success) {
      error.value = new Error('Invalid content');
      return;
    }

    saving.value = true;
    error.value = null;

    try {
      const updated = await useApi<Generation>(`/api/vacancies/${vacancyId}/generation`, {
        method: 'PUT',
        body: {
          content: content.value,
          generationId: generation.value.id
        }
      });

      generation.value = updated;
      originalContent.value = structuredClone(updated.content);
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to save generation');
      throw error.value;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Undo last change
   */
  function undo() {
    undoHistory();
  }

  /**
   * Redo undone change
   */
  function redo() {
    redoHistory();
  }

  /**
   * Discard unsaved changes
   */
  function discardChanges() {
    if (originalContent.value) {
      content.value = structuredClone(originalContent.value);
    }
  }

  // =========================================
  // Auto-save with watchDebounced (T035)
  // =========================================

  if (autoSave && import.meta.client) {
    watchDebounced(
      () => content.value,
      async () => {
        if (!isDirty.value || !content.value || saving.value) return;

        // Validate before auto-save
        const validation = ResumeContentSchema.safeParse(content.value);
        if (!validation.success) return;

        try {
          await saveContent();
          // Show subtle success indicator (T039)
          toast.add({
            title: t('vacancy.resume.autoSaved'),
            color: 'success',
            icon: 'i-lucide-check'
          });
        } catch {
          toast.add({
            title: t('vacancy.resume.saveFailed'),
            description: error.value?.message,
            color: 'error',
            icon: 'i-lucide-alert-circle'
          });
        }
      },
      {
        debounce: autoSaveDelay,
        deep: true
      }
    );
  }

  return {
    // State
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
