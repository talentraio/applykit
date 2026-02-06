/**
 * useResume Composable
 *
 * High-level composable wrapping the resume store for page use.
 * Provides reactive state, auto-save with debounce, and undo/redo via shared history.
 *
 * Features:
 * - Auto-save on content changes (via useResumeEditHistory)
 * - Auto-save on settings changes
 * - Undo/redo via useResumeEditHistory
 * - Reactive computed properties
 *
 * Related: T030, T031 (US3)
 */

import type { ResumeContent, ResumeFormatSettings } from '@int/schema';
import type { EditorTab } from '../stores';
import type { PreviewType } from '../types/preview';
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

  const store = useResumeStore();
  const {
    getLoading,
    getSaving,
    getLastError,
    getPreviewType,
    currentSettings,
    getAtsSettings,
    getHumanSettings,
    getActiveTab
  } = storeToRefs(store);
  const toast = useToast();
  const { t } = useI18n();

  // =========================================
  // Reactive State
  // =========================================

  const resume = computed(() => store.cachedResumesList[0]?.resume ?? null);
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
    getSettings: () => store.currentSettings,
    setContent: newContent => {
      if (resumeId.value) {
        store.updateContent(newContent, resumeId.value);
      }
    },
    setSettings: newSettings => store.updateSettings(newSettings),
    debounceDelay: autoSaveDelay,
    autoSnapshot: autoSave,
    autoSave: autoSave
      ? {
          save: () => (resumeId.value ? store.saveContent(resumeId.value) : Promise.resolve(null)),
          saveSettings: () =>
            resumeId.value ? store.saveSettings(resumeId.value) : Promise.resolve(null),
          isSaving: () => store.saving,
          onError: () => {
            toast.add({
              title: t('resume.error.updateFailed'),
              description: store.error?.message,
              color: 'error',
              icon: 'i-lucide-alert-circle'
            });
          }
        }
      : undefined
  });

  // isDirty is true if there are history entries (changes have been made)
  const isDirty = computed(() => history.historyLength.value > 1);

  // =========================================
  // Actions
  // =========================================

  const fetchResume = async () => store.fetchResume();

  const uploadResume = async (file: File, title?: string) => {
    const result = await store.uploadResume(file, title);
    toast.add({
      title: t('resume.upload.success'),
      color: 'success',
      icon: 'i-lucide-check'
    });
    return result;
  };

  const createFromContent = async (resumeContent: ResumeContent, title?: string) =>
    store.createFromContent(resumeContent, title);

  const updateContent = (newContent: ResumeContent) => {
    if (resumeId.value) {
      store.updateContent(newContent, resumeId.value);
    }
  };

  const updateField = <K extends keyof ResumeContent>(field: K, value: ResumeContent[K]) => {
    if (resumeId.value) {
      store.updateField(field, value, resumeId.value);
    }
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
    } catch {
      toast.add({
        title: t('resume.error.updateFailed'),
        description: store.error?.message,
        color: 'error',
        icon: 'i-lucide-alert-circle'
      });
      throw store.error;
    }
  };

  const setPreviewType = (type: PreviewType) => {
    store.setPreviewType(type);
  };

  const updateSettings = (settings: Partial<ResumeFormatSettings>) => {
    store.updateSettings(settings);
  };

  const saveSettings = async () => {
    const id = resumeId.value;
    if (!id) {
      throw new Error(t('resume.error.fetchFailed'));
    }

    try {
      const result = await store.saveSettings(id);
      toast.add({
        title: t('resume.success.settingsUpdated'),
        color: 'success',
        icon: 'i-lucide-check'
      });
      return result;
    } catch {
      toast.add({
        title: t('resume.error.settingsUpdateFailed'),
        description: store.error?.message,
        color: 'error',
        icon: 'i-lucide-alert-circle'
      });
      throw store.error;
    }
  };

  const setActiveTab = (tab: EditorTab) => {
    store.setActiveTab(tab);
  };

  const discardChanges = async () => {
    await store.fetchResume();
    history.clearHistory();
    toast.add({
      title: t('resume.editor.changesDiscarded'),
      color: 'neutral',
      icon: 'i-lucide-undo'
    });
  };

  return {
    // State
    resume,
    hasResume,
    content,
    editingContent,
    loading: getLoading,
    saving: getSaving,
    error: getLastError,
    isDirty,

    // Preview state
    previewType: getPreviewType,
    currentSettings,
    atsSettings: getAtsSettings,
    humanSettings: getHumanSettings,

    // UI state
    activeTab: getActiveTab,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    historyLength: history.historyLength,

    // Actions
    fetchResume,
    uploadResume,
    createFromContent,
    updateContent,
    updateField,
    saveContent,
    undo: history.undo,
    redo: history.redo,
    setPreviewType,
    updateSettings,
    saveSettings,
    setActiveTab,
    discardChanges
  };
}
