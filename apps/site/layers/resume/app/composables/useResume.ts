/**
 * useResume Composable
 *
 * High-level composable wrapping the resume store for page use.
 * Provides reactive state, auto-save with debounce, and undo/redo via shared history.
 * Settings are sourced from resume store (bound to active resume).
 *
 * Multi-resume aware: uses activeResumeId instead of hardcoded index 0.
 *
 * Features:
 * - Auto-save on content changes (via useResumeEditHistory)
 * - Settings managed by useResumeStore (throttled PATCH, per-resume)
 * - Undo/redo via useResumeEditHistory with tagged entries
 * - Reactive computed properties
 */

import type { PatchFormatSettingsBody, ResumeContent } from '@int/schema';
import { useResumeStore } from '../stores';

/**
 * useResume composable options
 */
export type UseResumeOptions = {
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
 * useResume composable for resume page
 *
 * @param options - Composable options
 * @returns Resume state and actions
 */
export function useResume(options: UseResumeOptions = {}) {
  const appConfig = useAppConfig();
  const { autoSave = true, autoSaveDelay = appConfig.resume.autosaveDelay } = options;
  const settingsAutoSaveDelay = 200;

  const store = useResumeStore();
  const { getActiveTab, getPreviewType, getCurrentSettings, getAtsSettings, getHumanSettings } =
    storeToRefs(store);
  const {
    setActiveTab,
    createFromContent,
    invalidateContentSaves,
    setPreviewType,
    setFullSettings,
    updateSettings: updateStoreSettings,
    patchSettings: patchStoreSettings,
    putSettings: putStoreSettings
  } = store;
  const toast = useToast();
  const { t } = useI18n();

  const getErrorMessage = (error: unknown): string | undefined => {
    return error instanceof Error && error.message ? error.message : undefined;
  };

  // =========================================
  // Reactive State (resume-id-aware)
  // =========================================

  const resume = computed(() => store.activeResume);
  const resumeId = computed(() => resume.value?.id ?? null);
  const hasResume = computed(() => resume.value !== null);
  const content = computed(() => resume.value?.content ?? null);
  const editingContent = computed(() => resume.value?.content ?? null);

  // =========================================
  // Undo/Redo + Auto-save via shared history
  // =========================================

  const history = useResumeEditHistory({
    resumeId: () => resumeId.value,
    getContent: () => content.value,
    getSettings: () => ({ ats: getAtsSettings.value, human: getHumanSettings.value }),
    setContent: newContent => {
      if (resumeId.value) {
        store.updateContent(newContent, resumeId.value);
      }
    },
    setSettings: newSettings => setFullSettings(newSettings),
    debounceDelay: autoSaveDelay,
    settingsDebounceDelay: settingsAutoSaveDelay,
    autoSnapshot: autoSave,
    autoSave: autoSave
      ? {
          save: () => (resumeId.value ? store.saveContent(resumeId.value) : Promise.resolve(null)),
          saveSettingsPatch: partial => patchStoreSettings(partial),
          saveSettingsFull: () => putStoreSettings(),
          isSaving: () => store.isContentSaveInProgress,
          onError: error => {
            toast.add({
              title: t('resume.error.updateFailed'),
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

  const uploadResume = async (file: File, title?: string, replaceResumeId?: string) => {
    const result = await store.uploadResume(file, title, replaceResumeId);
    toast.add({
      title: t('resume.upload.success'),
      color: 'success',
      icon: 'i-lucide-check'
    });
    return result;
  };

  const updateContent = (newContent: ResumeContent) => {
    if (!resumeId.value) return;
    store.updateContent(newContent, resumeId.value);
    history.queueContentAutosave();
  };

  const updateSettings = (partial: PatchFormatSettingsBody) => {
    updateStoreSettings(partial);
    history.queueSettingsAutosave(partial);
  };

  const updateField = <K extends keyof ResumeContent>(field: K, value: ResumeContent[K]) => {
    if (!resumeId.value) return;
    store.updateField(field, value, resumeId.value);
    history.queueContentAutosave();
  };

  const saveContent = async () => {
    const id = resumeId.value;
    if (!id) {
      throw new Error(t('resume.error.fetchFailed'));
    }

    try {
      const result = await store.saveContent(id);
      toast.add({
        title: t('resume.success.updated'),
        color: 'success',
        icon: 'i-lucide-check'
      });
      return result;
    } catch (error) {
      toast.add({
        title: t('resume.error.updateFailed'),
        description: getErrorMessage(error),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      });
      throw error;
    }
  };

  const patchSettings = async (partial: PatchFormatSettingsBody) => {
    try {
      await patchStoreSettings(partial);
    } catch {
      toast.add({
        title: t('resume.error.settingsUpdateFailed'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      });
    }
  };

  const discardChanges = async () => {
    const id = resumeId.value;
    try {
      history.cancelPendingAutosave();
      invalidateContentSaves();

      const restored = history.restoreInitialSnapshot();
      if (restored && id) {
        const results = await Promise.allSettled([store.saveContent(id), putStoreSettings()]);

        const rejectedResult = results.find(
          (result): result is PromiseRejectedResult => result.status === 'rejected'
        );
        if (rejectedResult) {
          throw rejectedResult.reason;
        }
      } else if (id) {
        await store.fetchResumeById(id, { force: true });
      }

      history.clearHistory();
      toast.add({
        title: t('resume.editor.changesDiscarded'),
        color: 'neutral',
        icon: 'i-lucide-undo'
      });
    } catch (error) {
      toast.add({
        title: t('resume.error.fetchFailed'),
        description: getErrorMessage(error),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      });
      throw error;
    }
  };

  return {
    // State
    resume,
    hasResume,
    content,
    editingContent,
    isDirty: history.isDirty,

    // Preview state
    previewType: getPreviewType,
    currentSettings: getCurrentSettings,
    atsSettings: getAtsSettings,
    humanSettings: getHumanSettings,

    // UI state
    activeTab: getActiveTab,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    historyLength: history.historyLength,

    // Actions
    uploadResume,
    createFromContent,
    updateContent,
    updateField,
    saveContent,
    undo: history.undo,
    redo: history.redo,
    setPreviewType,
    updateSettings,
    patchSettings,
    setActiveTab,
    discardChanges
  };
}
