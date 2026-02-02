/**
 * useResume Composable
 *
 * High-level composable wrapping the resume store for page use.
 * Provides reactive state, auto-save with debounce, and convenience methods.
 *
 * Features:
 * - Auto-save on content changes (debounced)
 * - Reactive computed properties
 * - Loading/saving state management
 * - Error handling
 *
 * Related: T030, T031 (US3)
 */

import type { ResumeContent, ResumeFormatSettings } from '@int/schema';
import type { EditorTab } from '../stores';
import type { PreviewType } from '../types/preview';
import { watchDebounced } from '@vueuse/core';
import { useResumeStore } from '../stores';

/**
 * Auto-save debounce delay in milliseconds
 */
const AUTO_SAVE_DELAY = 2000;

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
   * @default 2000
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
  const { autoSave = true, autoSaveDelay = AUTO_SAVE_DELAY } = options;

  const store = useResumeStore();
  const { t } = useI18n();

  // Toast for notifications
  const toast = useToast();

  // =========================================
  // Reactive State
  // =========================================

  const resume = computed(() => store.resume);
  const hasResume = computed(() => store.hasResume);
  const content = computed(() => store.displayContent);
  const editingContent = computed(() => store.editingContent);

  const loading = computed(() => store.loading);
  const saving = computed(() => store.saving);
  const error = computed(() => store.error);
  const isDirty = computed(() => store.isDirty);

  const previewType = computed(() => store.previewType);
  const currentSettings = computed(() => store.currentSettings);
  const atsSettings = computed(() => store.atsSettings);
  const humanSettings = computed(() => store.humanSettings);

  const activeTab = computed(() => store.activeTab);
  const canUndo = computed(() => store.canUndo);
  const canRedo = computed(() => store.canRedo);
  const historyLength = computed(() => store.historyLength);

  // =========================================
  // Auto-save with watchDebounced (T030)
  // =========================================

  if (autoSave && import.meta.client) {
    watchDebounced(
      () => store.editingContent,
      async () => {
        if (!store.isDirty || !store.editingContent) return;

        try {
          await store.saveContent();
          toast.add({
            title: t('resume.success.updated'),
            color: 'success',
            icon: 'i-lucide-check'
          });
        } catch {
          toast.add({
            title: t('resume.error.updateFailed'),
            description: store.error?.message,
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

  // =========================================
  // Actions
  // =========================================

  /**
   * Fetch resume from server
   */
  async function fetchResume() {
    return store.fetchResume();
  }

  /**
   * Upload resume file
   */
  async function uploadResume(file: File, title?: string) {
    const result = await store.uploadResume(file, title);
    toast.add({
      title: t('resume.upload.success'),
      color: 'success',
      icon: 'i-lucide-check'
    });
    return result;
  }

  /**
   * Create resume from content
   */
  async function createFromContent(resumeContent: ResumeContent, title?: string) {
    return store.createFromContent(resumeContent, title);
  }

  /**
   * Update content (local state)
   */
  function updateContent(newContent: ResumeContent) {
    store.updateContent(newContent);
  }

  /**
   * Update a specific field
   */
  function updateField<K extends keyof ResumeContent>(field: K, value: ResumeContent[K]) {
    store.updateField(field, value);
  }

  /**
   * Save content to server (manual save)
   */
  async function saveContent() {
    if (!isDirty.value) return resume.value;

    try {
      const result = await store.saveContent();
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
      throw error.value;
    }
  }

  /**
   * Undo last change
   */
  function undo() {
    store.undo();
  }

  /**
   * Redo undone change
   */
  function redo() {
    store.redo();
  }

  /**
   * Set preview type
   */
  function setPreviewType(type: PreviewType) {
    store.setPreviewType(type);
  }

  /**
   * Update format settings
   */
  function updateSettings(settings: Partial<ResumeFormatSettings>) {
    store.updateSettings(settings);
  }

  /**
   * Save settings to server
   */
  async function saveSettings() {
    try {
      const result = await store.saveSettings();
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
      throw error.value;
    }
  }

  /**
   * Set active tab
   */
  function setActiveTab(tab: EditorTab) {
    store.setActiveTab(tab);
  }

  /**
   * Discard unsaved changes
   */
  function discardChanges() {
    store.discardChanges();
    toast.add({
      title: t('resume.editor.changesDiscarded'),
      color: 'neutral',
      icon: 'i-lucide-undo'
    });
  }

  return {
    // State
    resume,
    hasResume,
    content,
    editingContent,
    loading,
    saving,
    error,
    isDirty,

    // Preview state
    previewType,
    currentSettings,
    atsSettings,
    humanSettings,

    // UI state
    activeTab,
    canUndo,
    canRedo,
    historyLength,

    // Actions
    fetchResume,
    uploadResume,
    createFromContent,
    updateContent,
    updateField,
    saveContent,
    undo,
    redo,
    setPreviewType,
    updateSettings,
    saveSettings,
    setActiveTab,
    discardChanges
  };
}
