/**
 * useResumeEditHistory Composable
 *
 * Shared undo/redo history + auto-save for resume editing.
 * Uses centralized debounced queues for content and settings changes.
 * History entries are tagged with what changed (content or settings) for
 * type-dispatched save on undo/redo.
 *
 * Flow on content change:
 * 1. User edits content
 * 2. Content autosave queue fires after content debounce delay
 * 3. Snapshot is created (if content differs from last snapshot)
 * 4. Auto-save is triggered (if content differs from last saved state)
 * 5. After save, content hash is updated to post-server-response content
 *
 * Features:
 * - Unified tagged history: Ctrl+Z undoes most recent change regardless of type
 * - Max 10 entries per resume, max 100 total
 * - Debounced auto-save for content with Zod validation
 * - Debounced auto-save for settings with separate delay
 * - Pending debounced saves are canceled on undo/redo to avoid race collisions
 * - Undo/redo dispatches correct save handler based on entry tag
 */

import type {
  ResumeContent,
  ResumeFormatSettingsAts,
  ResumeFormatSettingsHuman
} from '@int/schema';
import { ResumeContentSchema } from '@int/schema';

/**
 * Settings snapshot type used in history entries
 */
export type SettingsSnapshot = {
  ats: ResumeFormatSettingsAts;
  human: ResumeFormatSettingsHuman;
};

/**
 * History entry for a resume snapshot
 * Tagged with what changed for type-dispatched save on undo/redo
 */
export type HistoryEntry = {
  /** Resume/Generation ID */
  id: string;
  /** What changed in this entry */
  type: 'content' | 'settings';
  /** Resume content snapshot */
  content: ResumeContent;
  /** Format settings snapshot (both ats and human) */
  settings: SettingsSnapshot;
  /** Timestamp of the snapshot */
  timestamp: number;
};

/**
 * History state stored in useState
 */
type HistoryState = {
  /** All history entries across all resumes */
  entries: HistoryEntry[];
  /** Current index per resume id: { [resumeId]: index } */
  indexes: Record<string, number>;
};

/**
 * Auto-save configuration
 */
export type AutoSaveConfig = {
  /** Save content function */
  save: () => Promise<unknown>;
  /** Save settings function (for separate settings persistence) */
  saveSettings: () => Promise<unknown>;
  /** Getter for saving state (to prevent concurrent saves) */
  isSaving: () => boolean;
  /** Called when save fails */
  onError?: (error: unknown) => void;
};

/**
 * Options for useResumeEditHistory
 */
export type UseResumeEditHistoryOptions = {
  /** Resume/Generation ID (reactive) */
  resumeId: MaybeRefOrGetter<string | null>;
  /** Getter for current content */
  getContent: () => ResumeContent | null;
  /** Getter for current settings (both ats and human) */
  getSettings: () => SettingsSnapshot;
  /** Setter for content (called on undo/redo) */
  setContent: (content: ResumeContent) => void;
  /** Setter for settings (called on undo/redo) */
  setSettings: (settings: SettingsSnapshot) => void;
  /** Debounce delay for content auto-snapshot and auto-save (ms) */
  debounceDelay?: number;
  /** Debounce delay for settings auto-snapshot and auto-save (ms) */
  settingsDebounceDelay?: number;
  /** Enable auto-snapshot + auto-save on content changes */
  autoSnapshot?: boolean;
  /** Auto-save configuration */
  autoSave?: AutoSaveConfig;
};

/**
 * Return type for useResumeEditHistory
 */
export type UseResumeEditHistoryReturn = {
  /** Can undo to previous state */
  canUndo: ComputedRef<boolean>;
  /** Can redo to next state */
  canRedo: ComputedRef<boolean>;
  /** True when there are unsaved local changes in history */
  isDirty: ComputedRef<boolean>;
  /** Number of history entries for current resume */
  historyLength: ComputedRef<number>;
  /** Current history index for current resume */
  currentIndex: ComputedRef<number>;
  /** Undo to previous state */
  undo: () => void;
  /** Redo to next state */
  redo: () => void;
  /** Manually save a snapshot */
  saveSnapshot: () => void;
  /** Queue debounced content snapshot + auto-save */
  queueContentAutosave: () => void;
  /** Queue debounced settings snapshot + auto-save */
  queueSettingsAutosave: () => void;
  /** Cancel all pending debounced auto-save calls */
  cancelPendingAutosave: () => void;
  /** Clear history for current resume */
  clearHistory: () => void;
};

/** Max entries per single resume */
const MAX_ENTRIES_PER_RESUME = 10;
/** Max total entries across all resumes */
const MAX_TOTAL_ENTRIES = 100;
/**
 * Deep clone helper
 */
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

type DebouncedRunner = {
  run: () => void;
  cancel: () => void;
};

const createDebouncedRunner = (
  callback: () => void | Promise<void>,
  delay: number
): DebouncedRunner => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    run: () => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        timer = null;
        void callback();
      }, delay);
    },
    cancel: () => {
      if (!timer) return;
      clearTimeout(timer);
      timer = null;
    }
  };
};

/**
 * useResumeEditHistory composable
 *
 * Provides unified undo/redo history + optional auto-save for resume editing.
 * Uses centralized debounced queues for content and settings changes.
 * History entries are tagged with what changed for type-dispatched save.
 *
 * @example
 * ```typescript
 * const history = useResumeEditHistory({
 *   resumeId: () => resume.value?.id ?? null,
 *   getContent: () => store.content,
 *   getSettings: () => ({ ats: formatStore.ats, human: formatStore.human }),
 *   setContent: (content) => store.setContent(content),
 *   setSettings: (settings) => formatStore.setFullSettings(settings),
 *   autoSave: {
 *     save: () => store.saveContent(),
 *     saveSettings: () => formatStore.patchSettings(settingsDiff),
 *     isSaving: () => store.saving,
 *     onError: (err) => showToast(err)
 *   }
 * });
 * ```
 */
export function useResumeEditHistory(
  options: UseResumeEditHistoryOptions
): UseResumeEditHistoryReturn {
  const {
    resumeId,
    getContent,
    getSettings,
    setContent,
    setSettings,
    debounceDelay = 2000,
    settingsDebounceDelay = debounceDelay,
    autoSnapshot = true,
    autoSave
  } = options;

  // Initialize state
  const state = useState<HistoryState>('resume-edit-history', () => ({
    entries: [],
    indexes: {}
  }));

  // Get current resume ID as computed
  const currentId = computed(() => toValue(resumeId));

  // Get entries for current resume
  const currentEntries = computed(() => {
    const id = currentId.value;
    if (!id) return [];
    return state.value.entries.filter(e => e.id === id);
  });

  // Get current index for current resume
  const currentIndex = computed(() => {
    const id = currentId.value;
    if (!id) return -1;
    return state.value.indexes[id] ?? -1;
  });

  // Can undo/redo
  const canUndo = computed(() => currentIndex.value > 0);
  const canRedo = computed(() => {
    const entries = currentEntries.value;
    return currentIndex.value < entries.length - 1;
  });

  // History length for current resume
  const historyLength = computed(() => currentEntries.value.length);
  const isDirty = computed(() => historyLength.value > 1);

  /**
   * Save current state to history.
   * Tags entry based on what changed (content or settings).
   * Returns true if a new snapshot was actually created.
   */
  const saveSnapshot = (changeHint?: 'content' | 'settings'): boolean => {
    const id = currentId.value;
    const content = getContent();
    const settings = getSettings();

    if (!id || !content) return false;

    // Get current entries for this resume
    const resumeEntries = state.value.entries.filter(e => e.id === id);
    const otherEntries = state.value.entries.filter(e => e.id !== id);
    const currentIdx = state.value.indexes[id] ?? -1;

    // Check if content is same as current snapshot — determine change type
    let changeType: 'content' | 'settings' = 'content';
    if (currentIdx >= 0 && resumeEntries[currentIdx]) {
      const current = resumeEntries[currentIdx];
      const contentChanged = JSON.stringify(current.content) !== JSON.stringify(content);
      const settingsChanged = JSON.stringify(current.settings) !== JSON.stringify(settings);

      if (!contentChanged && !settingsChanged) {
        return false; // No change, skip
      }

      if (contentChanged && settingsChanged && changeHint) {
        changeType = changeHint;
      } else {
        changeType = contentChanged ? 'content' : 'settings';
      }
    }

    const newEntry: HistoryEntry = {
      id,
      type: changeType,
      content: clone(content),
      settings: clone(settings),
      timestamp: Date.now()
    };

    // Remove any future states (if we're not at the end)
    let newResumeEntries = currentIdx >= 0 ? resumeEntries.slice(0, currentIdx + 1) : [];

    // Add new entry
    newResumeEntries.push(newEntry);

    // Trim to max per resume
    if (newResumeEntries.length > MAX_ENTRIES_PER_RESUME) {
      newResumeEntries = newResumeEntries.slice(-MAX_ENTRIES_PER_RESUME);
    }

    // Combine with other entries
    let allEntries = [...otherEntries, ...newResumeEntries];

    // Trim total entries (remove oldest across all resumes)
    if (allEntries.length > MAX_TOTAL_ENTRIES) {
      // Sort by timestamp and keep newest
      allEntries.sort((a, b) => a.timestamp - b.timestamp);
      allEntries = allEntries.slice(-MAX_TOTAL_ENTRIES);
    }

    // Update indexes
    const newIndexes = { ...state.value.indexes };
    // Find new index for current resume
    const newResumeEntriesInAll = allEntries.filter(e => e.id === id);
    newIndexes[id] = newResumeEntriesInAll.length - 1;

    // Clean up indexes for resumes no longer in history
    const idsInHistory = new Set(allEntries.map(e => e.id));
    for (const key of Object.keys(newIndexes)) {
      if (!idsInHistory.has(key)) {
        delete newIndexes[key];
      }
    }

    // Update state
    state.value = {
      entries: allEntries,
      indexes: newIndexes
    };

    return true;
  };

  // =========================================
  // Centralized debounce controller
  // =========================================

  let lastContentHash: string | null = null;
  let lastSettingsHash: string | null = null;
  let lastSavedContentHash: string | null = null;
  let lastSavedSettingsHash: string | null = null;

  const resetHashes = (): void => {
    lastContentHash = null;
    lastSettingsHash = null;
    lastSavedContentHash = null;
    lastSavedSettingsHash = null;
  };

  const initHashes = (content: ResumeContent | null, settings: SettingsSnapshot): void => {
    if (!content) return;
    lastContentHash = JSON.stringify(content);
    lastSettingsHash = JSON.stringify(settings);
    lastSavedContentHash = JSON.stringify(content);
    lastSavedSettingsHash = JSON.stringify(settings);
  };

  const isAutosaveEnabled = computed(() => autoSnapshot && import.meta.client);

  async function onContentChanged(currentHash: string): Promise<void> {
    const currentContent = getContent();
    if (!currentContent) return;

    saveSnapshot('content');
    lastContentHash = currentHash;
    lastSettingsHash = JSON.stringify(getSettings());

    if (!autoSave) return;
    if (autoSave.isSaving()) {
      queueContentAutosave();
      return;
    }
    if (currentHash === lastSavedContentHash) return;

    try {
      const validation = ResumeContentSchema.safeParse(currentContent);
      if (!validation.success) return;

      await autoSave.save();
      const savedContent = getContent();
      if (savedContent) {
        lastSavedContentHash = JSON.stringify(savedContent);
      }
    } catch (error: unknown) {
      autoSave.onError?.(error);
    }
  }

  async function onSettingsChanged(currentHash: string): Promise<void> {
    const currentContent = getContent();
    if (!currentContent) return;

    saveSnapshot('settings');
    lastSettingsHash = currentHash;
    lastContentHash = JSON.stringify(currentContent);

    if (!autoSave) return;
    if (autoSave.isSaving()) {
      queueSettingsAutosave();
      return;
    }
    if (currentHash === lastSavedSettingsHash) return;

    try {
      await autoSave.saveSettings();
      lastSavedSettingsHash = JSON.stringify(getSettings());
    } catch (error: unknown) {
      autoSave.onError?.(error);
    }
  }

  const runContentAutosave = createDebouncedRunner(async (): Promise<void> => {
    const currentContent = getContent();
    if (!currentContent || !currentId.value) return;

    const currentHash = JSON.stringify(currentContent);
    if (currentHash === lastContentHash && currentHash === lastSavedContentHash) return;
    await onContentChanged(currentHash);
  }, debounceDelay);

  const runSettingsAutosave = createDebouncedRunner(async (): Promise<void> => {
    const currentContent = getContent();
    if (!currentContent || !currentId.value) return;

    const currentHash = JSON.stringify(getSettings());
    if (currentHash === lastSettingsHash && currentHash === lastSavedSettingsHash) return;
    await onSettingsChanged(currentHash);
  }, settingsDebounceDelay);

  function queueContentAutosave(): void {
    if (!isAutosaveEnabled.value) return;

    const content = getContent();
    if (!content || !currentId.value) return;

    runContentAutosave.run();
  }

  function queueSettingsAutosave(): void {
    if (!isAutosaveEnabled.value) return;

    const content = getContent();
    if (!content || !currentId.value) return;

    runSettingsAutosave.run();
  }

  const cancelPendingAutosave = (): void => {
    runContentAutosave.cancel();
    runSettingsAutosave.cancel();
  };

  /**
   * Undo to previous state.
   * Dispatches correct save handler based on entry type tag.
   */
  const undo = (): void => {
    if (!canUndo.value) return;

    const id = currentId.value;
    if (!id) return;

    cancelPendingAutosave();

    const newIndex = currentIndex.value - 1;
    const entries = currentEntries.value;
    const snapshot = entries[newIndex];
    const undoneEntry = entries[currentIndex.value];

    if (snapshot) {
      // Update index
      state.value = {
        ...state.value,
        indexes: {
          ...state.value.indexes,
          [id]: newIndex
        }
      };

      // Apply snapshot to store
      setContent(clone(snapshot.content));
      setSettings(clone(snapshot.settings));

      // Dispatch save based on what the undone entry changed
      if (autoSave && undoneEntry) {
        if (undoneEntry.type === 'content') {
          autoSave.save().catch(error => autoSave.onError?.(error));
        } else {
          autoSave.saveSettings().catch(error => autoSave.onError?.(error));
        }
      }
    }
  };

  /**
   * Redo to next state.
   * Dispatches correct save handler based on entry type tag.
   */
  const redo = (): void => {
    if (!canRedo.value) return;

    const id = currentId.value;
    if (!id) return;

    cancelPendingAutosave();

    const newIndex = currentIndex.value + 1;
    const entries = currentEntries.value;
    const snapshot = entries[newIndex];

    if (snapshot) {
      // Update index
      state.value = {
        ...state.value,
        indexes: {
          ...state.value.indexes,
          [id]: newIndex
        }
      };

      // Apply snapshot to store
      setContent(clone(snapshot.content));
      setSettings(clone(snapshot.settings));

      // Dispatch save based on what this entry changed
      if (autoSave) {
        if (snapshot.type === 'content') {
          autoSave.save().catch(error => autoSave.onError?.(error));
        } else {
          autoSave.saveSettings().catch(error => autoSave.onError?.(error));
        }
      }
    }
  };

  /**
   * Clear history for current resume
   */
  const clearHistory = (): void => {
    const id = currentId.value;
    if (!id) return;

    cancelPendingAutosave();

    const otherEntries = state.value.entries.filter(e => e.id !== id);
    const newIndexes = { ...state.value.indexes };
    delete newIndexes[id];

    state.value = {
      entries: otherEntries,
      indexes: newIndexes
    };
  };

  // Initialize history and hash baselines when resumeId changes
  watch(
    currentId,
    (newId, oldId) => {
      if (newId === oldId) return;

      cancelPendingAutosave();
      resetHashes();

      if (!isAutosaveEnabled.value || !newId) return;

      const entries = state.value.entries.filter(e => e.id === newId);
      if (entries.length === 0 && getContent()) {
        saveSnapshot();
        initHashes(getContent(), getSettings());
      } else if (entries.length > 0) {
        const currentEntry = entries[state.value.indexes[newId] ?? entries.length - 1];
        if (currentEntry) {
          initHashes(currentEntry.content, currentEntry.settings);
        }
      }
    },
    { immediate: true }
  );

  onScopeDispose(() => {
    cancelPendingAutosave();
  });

  return {
    canUndo,
    canRedo,
    isDirty,
    historyLength,
    currentIndex,
    undo,
    redo,
    saveSnapshot: () => {
      saveSnapshot();
    },
    queueContentAutosave,
    queueSettingsAutosave,
    cancelPendingAutosave,
    clearHistory
  };
}
