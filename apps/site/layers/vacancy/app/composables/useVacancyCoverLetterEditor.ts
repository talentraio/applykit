import type { CoverLetterGenerateBody, SpacingSettings } from '@int/schema';
import type {
  CoverLetterCacheItem,
  CoverLetterEditorSnapshot
} from '@site/vacancy/app/stores/cover-letter';
import { DefaultCoverLetterFormatSettings } from '@int/schema';

export type UseVacancyCoverLetterEditorOptions = {
  autoSave?: boolean;
  autoSaveDelay?: number;
  onAutoSaveError?: (error: unknown) => void;
};

export type UseVacancyCoverLetterEditorReturn = {
  contentMarkdown: ComputedRef<string>;
  subjectLine: ComputedRef<string | null>;
  formatSettings: ComputedRef<SpacingSettings>;
  hasPersistedCoverLetter: ComputedRef<boolean>;
  coverLetterSaving: ComputedRef<boolean>;
  canUndo: ComputedRef<boolean>;
  canRedo: ComputedRef<boolean>;
  fetchCoverLetter: (vacancyId: string) => Promise<CoverLetterCacheItem | null>;
  generateCoverLetter: (
    vacancyId: string,
    payload?: CoverLetterGenerateBody
  ) => Promise<CoverLetterCacheItem | null>;
  updateFormatSetting: (key: keyof SpacingSettings, value: number) => void;
  undo: () => void;
  redo: () => void;
};

const cloneSpacingSettings = (settings: SpacingSettings): SpacingSettings => ({
  marginX: settings.marginX,
  marginY: settings.marginY,
  fontSize: settings.fontSize,
  lineHeight: settings.lineHeight,
  blockSpacing: settings.blockSpacing
});

const snapshotsEqual = (
  first: CoverLetterEditorSnapshot | null,
  second: CoverLetterEditorSnapshot | null
): boolean => {
  if (!first || !second) return false;
  return JSON.stringify(first) === JSON.stringify(second);
};

const cloneSnapshot = (snapshot: CoverLetterEditorSnapshot): CoverLetterEditorSnapshot => ({
  contentMarkdown: snapshot.contentMarkdown,
  subjectLine: snapshot.subjectLine,
  formatSettings: cloneSpacingSettings(snapshot.formatSettings)
});

const toSnapshotFromCoverLetter = (
  coverLetter: CoverLetterCacheItem
): CoverLetterEditorSnapshot => ({
  contentMarkdown: coverLetter.contentMarkdown,
  subjectLine: coverLetter.subjectLine,
  formatSettings: cloneSpacingSettings(coverLetter.formatSettings)
});

const getDefaultSnapshot = (): CoverLetterEditorSnapshot => ({
  contentMarkdown: '',
  subjectLine: null,
  formatSettings: cloneSpacingSettings(DefaultCoverLetterFormatSettings)
});

export const useVacancyCoverLetterEditor = (
  options: UseVacancyCoverLetterEditorOptions = {}
): UseVacancyCoverLetterEditorReturn => {
  const appConfig = useAppConfig();
  const {
    autoSave = true,
    autoSaveDelay = appConfig.resume.autosaveDelay,
    onAutoSaveError
  } = options;
  const vacancyCoverLetterStore = useVacancyCoverLetterStore();

  const {
    getCoverLetter,
    getCoverLetterSaving,
    getHasPersistedCoverLetter,
    getCoverLetterEditorSnapshot
  } = storeToRefs(vacancyCoverLetterStore);

  const historyEntries = ref<CoverLetterEditorSnapshot[]>([]);
  const historyIndex = ref(-1);
  const isHydrating = ref(false);
  const isRestoringHistory = ref(false);
  const serverSnapshot = ref<CoverLetterEditorSnapshot | null>(null);

  const contentMarkdown = computed<string>({
    get: () => getCoverLetter.value?.contentMarkdown ?? '',
    set: value => {
      vacancyCoverLetterStore.updateCurrentContentMarkdown(value);
      triggerEditorChange();
    }
  });

  const subjectLine = computed<string | null>({
    get: () => getCoverLetter.value?.subjectLine ?? null,
    set: value => {
      vacancyCoverLetterStore.updateCurrentSubjectLine(value);
      triggerEditorChange();
    }
  });

  const formatSettings = computed<SpacingSettings>(() => {
    return getCoverLetter.value?.formatSettings ?? DefaultCoverLetterFormatSettings;
  });

  const canUndo = computed(() => historyIndex.value > 0);
  const canRedo = computed(() => {
    return historyIndex.value >= 0 && historyIndex.value < historyEntries.value.length - 1;
  });

  const toEditorSnapshot = (): CoverLetterEditorSnapshot => {
    const snapshot = getCoverLetterEditorSnapshot.value;
    if (!snapshot) {
      return getDefaultSnapshot();
    }

    return cloneSnapshot(snapshot);
  };

  const resetHistory = (initialSnapshot: CoverLetterEditorSnapshot | null): void => {
    if (!initialSnapshot) {
      historyEntries.value = [];
      historyIndex.value = -1;
      return;
    }

    historyEntries.value = [cloneSnapshot(initialSnapshot)];
    historyIndex.value = 0;
  };

  const initializeEditorState = (coverLetter: CoverLetterCacheItem | null): void => {
    isHydrating.value = true;

    const snapshot = coverLetter ? toSnapshotFromCoverLetter(coverLetter) : getDefaultSnapshot();
    serverSnapshot.value = coverLetter?.id ? cloneSnapshot(snapshot) : null;
    resetHistory(snapshot);

    isHydrating.value = false;
  };

  const pushHistorySnapshot = useDebounceFn(() => {
    if (!getHasPersistedCoverLetter.value || isHydrating.value || isRestoringHistory.value) return;

    const current = toEditorSnapshot();
    const currentAtIndex = historyEntries.value[historyIndex.value];

    if (currentAtIndex && snapshotsEqual(current, currentAtIndex)) {
      return;
    }

    const nextHistory = historyEntries.value.slice(0, historyIndex.value + 1);
    nextHistory.push(cloneSnapshot(current));

    if (nextHistory.length > 20) {
      nextHistory.shift();
    }

    historyEntries.value = nextHistory;
    historyIndex.value = nextHistory.length - 1;
  }, 350);

  const autosaveEditor = useDebounceFn(async () => {
    if (!autoSave || !getHasPersistedCoverLetter.value || isHydrating.value) return;

    const current = toEditorSnapshot();
    if (snapshotsEqual(current, serverSnapshot.value)) {
      return;
    }

    try {
      const updated = await vacancyCoverLetterStore.patchCurrentCoverLetter({
        contentMarkdown: current.contentMarkdown,
        subjectLine: current.subjectLine,
        formatSettings: current.formatSettings
      });

      if (!updated) return;

      serverSnapshot.value = toSnapshotFromCoverLetter(updated);
    } catch (error) {
      onAutoSaveError?.(error);
    }
  }, autoSaveDelay);

  function triggerEditorChange(): void {
    pushHistorySnapshot();
    void autosaveEditor();
  }

  const fetchCoverLetter = async (vacancyId: string): Promise<CoverLetterCacheItem | null> => {
    if (!vacancyId) {
      initializeEditorState(null);
      return null;
    }

    const coverLetter = await vacancyCoverLetterStore.fetchCoverLetter(vacancyId);
    initializeEditorState(coverLetter);
    return coverLetter;
  };

  const generateCoverLetter = async (
    vacancyId: string,
    payload?: CoverLetterGenerateBody
  ): Promise<CoverLetterCacheItem | null> => {
    if (!vacancyId) return null;

    const coverLetter = await vacancyCoverLetterStore.generateCoverLetter(vacancyId, payload);
    initializeEditorState(coverLetter);
    return coverLetter;
  };

  const applySnapshot = (snapshot: CoverLetterEditorSnapshot): void => {
    isRestoringHistory.value = true;

    vacancyCoverLetterStore.setCurrentEditorSnapshot(snapshot);

    queueMicrotask(() => {
      isRestoringHistory.value = false;
    });
  };

  const undo = (): void => {
    if (!canUndo.value) return;

    historyIndex.value -= 1;
    const snapshot = historyEntries.value[historyIndex.value];
    if (snapshot) {
      applySnapshot(snapshot);
    }
  };

  const redo = (): void => {
    if (!canRedo.value) return;

    historyIndex.value += 1;
    const snapshot = historyEntries.value[historyIndex.value];
    if (snapshot) {
      applySnapshot(snapshot);
    }
  };

  const updateFormatSetting = (key: keyof SpacingSettings, value: number): void => {
    if (!getHasPersistedCoverLetter.value) return;
    vacancyCoverLetterStore.updateCurrentFormatSetting(key, value);
    triggerEditorChange();
  };

  return {
    contentMarkdown,
    subjectLine,
    formatSettings,
    hasPersistedCoverLetter: computed(() => getHasPersistedCoverLetter.value),
    coverLetterSaving: computed(() => getCoverLetterSaving.value),
    canUndo,
    canRedo,
    fetchCoverLetter,
    generateCoverLetter,
    updateFormatSetting,
    undo,
    redo
  };
};
