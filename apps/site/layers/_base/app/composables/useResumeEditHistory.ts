/**
 * useResumeEditHistory Composable
 *
 * Shared undo/redo history + auto-save for resume editing.
 * Uses a SINGLE debounced watcher for both snapshot creation and auto-save.
 *
 * Flow on content change:
 * 1. User edits content
 * 2. Single watchDebounced fires after debounceDelay
 * 3. Snapshot is created (if content differs from last snapshot)
 * 4. Auto-save is triggered (if content differs from last saved state)
 * 5. After save, lastSavedHash is updated to post-server-response content
 *    → prevents re-triggering the watcher
 *
 * Features:
 * - Unified history across all resume editing contexts
 * - Max 10 entries per resume, max 100 total
 * - Debounced auto-save with Zod validation
 * - Single watcher eliminates race conditions
 */

import type { ResumeContent, ResumeFormatSettings } from '@int/schema';
import { ResumeContentSchema } from '@int/schema';
import { watchDebounced } from '@vueuse/core';

/**
 * History entry for a resume snapshot
 */
export type HistoryEntry = {
  /** Resume/Generation ID */
  id: string;
  /** Resume content snapshot */
  content: ResumeContent;
  /** Format settings snapshot */
  settings: ResumeFormatSettings;
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
  /** Save settings function (optional, for separate settings persistence) */
  saveSettings?: () => Promise<unknown>;
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
  /** Getter for current settings */
  getSettings: () => ResumeFormatSettings;
  /** Setter for content (called on undo/redo) */
  setContent: (content: ResumeContent) => void;
  /** Setter for settings (called on undo/redo) */
  setSettings: (settings: ResumeFormatSettings) => void;
  /** Debounce delay for auto-snapshot and auto-save (ms) */
  debounceDelay?: number;
  /** Enable auto-snapshot + auto-save on content changes */
  autoSnapshot?: boolean;
  /** Auto-save configuration (optional, only triggers if provided) */
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

/**
 * Compute content hash for comparison
 */
const contentHash = (
  content: ResumeContent | null,
  settings: ResumeFormatSettings
): string | null => {
  return content ? JSON.stringify({ content, settings }) : null;
};

/**
 * useResumeEditHistory composable
 *
 * Provides unified undo/redo history + optional auto-save for resume editing.
 * Uses a single debounced watcher to eliminate race conditions.
 *
 * @example
 * ```typescript
 * const history = useResumeEditHistory({
 *   resumeId: () => resume.value?.id ?? null,
 *   getContent: () => store.content,
 *   getSettings: () => store.settings,
 *   setContent: (content) => store.setContent(content),
 *   setSettings: (settings) => store.setSettings(settings),
 *   autoSave: {
 *     save: () => store.saveContent(),
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

  /**
   * Save current state to history.
   * Returns true if a new snapshot was actually created.
   */
  const saveSnapshot = (): boolean => {
    const id = currentId.value;
    const content = getContent();
    const settings = getSettings();

    if (!id || !content) return false;

    const newEntry: HistoryEntry = {
      id,
      content: clone(content),
      settings: clone(settings),
      timestamp: Date.now()
    };

    // Get current entries for this resume
    const resumeEntries = state.value.entries.filter(e => e.id === id);
    const otherEntries = state.value.entries.filter(e => e.id !== id);
    const currentIdx = state.value.indexes[id] ?? -1;

    // Check if content is same as current snapshot
    if (currentIdx >= 0 && resumeEntries[currentIdx]) {
      const current = resumeEntries[currentIdx];
      if (
        JSON.stringify(current.content) === JSON.stringify(content) &&
        JSON.stringify(current.settings) === JSON.stringify(settings)
      ) {
        return false; // No change, skip
      }
    }

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

  /**
   * Undo to previous state
   */
  const undo = (): void => {
    if (!canUndo.value) return;

    const id = currentId.value;
    if (!id) return;

    const newIndex = currentIndex.value - 1;
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
    }
  };

  /**
   * Redo to next state
   */
  const redo = (): void => {
    if (!canRedo.value) return;

    const id = currentId.value;
    if (!id) return;

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
    }
  };

  /**
   * Clear history for current resume
   */
  const clearHistory = (): void => {
    const id = currentId.value;
    if (!id) return;

    const otherEntries = state.value.entries.filter(e => e.id !== id);
    const newIndexes = { ...state.value.indexes };
    delete newIndexes[id];

    state.value = {
      entries: otherEntries,
      indexes: newIndexes
    };
  };

  // =========================================
  // Single watcher: snapshot + auto-save
  // =========================================

  if (autoSnapshot && import.meta.client) {
    // Hash tracking: combined for watcher dedup, separate for save decisions
    let lastHash: string | null = null;
    let lastSavedContentHash: string | null = null;
    let lastSavedSettingsHash: string | null = null;

    /**
     * Compute and set initial hashes.
     * Called once when content first becomes available.
     */
    const initHash = (content: ResumeContent | null, settings: ResumeFormatSettings): void => {
      if (content) {
        lastHash = contentHash(content, settings);
        lastSavedContentHash = JSON.stringify(content);
        lastSavedSettingsHash = JSON.stringify(settings);
      }
    };

    /**
     * Update saved hashes to current state (post-server-response).
     */
    const updateSavedHashes = (): void => {
      lastSavedContentHash = JSON.stringify(getContent());
      lastSavedSettingsHash = JSON.stringify(getSettings());
      lastHash = contentHash(getContent(), getSettings());
    };

    /**
     * Handle content/settings change: create snapshot + auto-save.
     * This is the ONLY place where debounced reactions happen.
     * Detects what changed (content vs settings) and calls appropriate save.
     */
    const onContentChanged = async (currentHash: string): Promise<void> => {
      // 1. Create snapshot (saveSnapshot has its own dedup check)
      saveSnapshot();

      // 2. Update lastHash to prevent re-triggering from the same content
      lastHash = contentHash(getContent(), getSettings()) ?? currentHash;

      // 3. Auto-save: determine what changed and call appropriate save function(s)
      if (!autoSave || autoSave.isSaving()) return;

      const currentContent = getContent();
      if (!currentContent) return;

      const contentChanged = JSON.stringify(currentContent) !== lastSavedContentHash;
      const settingsChanged = JSON.stringify(getSettings()) !== lastSavedSettingsHash;

      if (!contentChanged && !settingsChanged) return;

      try {
        if (autoSave.saveSettings) {
          // Separate endpoints: save only what changed
          if (contentChanged) {
            const validation = ResumeContentSchema.safeParse(currentContent);
            if (validation.success) {
              await autoSave.save();
            }
          }
          if (settingsChanged) {
            await autoSave.saveSettings();
          }
        } else {
          // Single save handles everything
          const validation = ResumeContentSchema.safeParse(currentContent);
          if (validation.success) {
            await autoSave.save();
          }
        }
        // Update saved hashes to post-server-response state
        updateSavedHashes();
      } catch (error: unknown) {
        autoSave.onError?.(error);
      }
    };

    // Single debounced watcher for content changes
    watchDebounced(
      () => contentHash(getContent(), getSettings()),
      async currentHash => {
        if (!currentHash || !currentId.value || currentHash === lastHash) return;
        await onContentChanged(currentHash);
      },
      {
        debounce: debounceDelay,
        immediate: false
      }
    );

    // Initialize history when resumeId changes
    watch(
      currentId,
      (newId, oldId) => {
        if (newId && newId !== oldId) {
          const entries = state.value.entries.filter(e => e.id === newId);
          if (entries.length === 0 && getContent()) {
            // First time: create initial snapshot
            saveSnapshot();
            initHash(getContent(), getSettings());
          } else if (entries.length > 0) {
            // Restore hash from existing entry
            const currentEntry = entries[state.value.indexes[newId] ?? entries.length - 1];
            if (currentEntry) {
              lastHash = contentHash(currentEntry.content, currentEntry.settings);
              lastSavedContentHash = JSON.stringify(currentEntry.content);
              lastSavedSettingsHash = JSON.stringify(currentEntry.settings);
            }
          }
        }
      },
      { immediate: true }
    );
  }

  return {
    canUndo,
    canRedo,
    historyLength,
    currentIndex,
    undo,
    redo,
    saveSnapshot: () => {
      saveSnapshot();
    },
    clearHistory
  };
}
