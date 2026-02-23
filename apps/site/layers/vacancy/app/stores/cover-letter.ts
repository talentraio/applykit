import type {
  CoverLetter,
  CoverLetterGenerateBody,
  CoverLetterLengthPreset,
  CoverLetterPatchBody,
  SpacingSettings
} from '@int/schema';
import { DefaultCoverLetterFormatSettings, normalizeNullableText } from '@int/schema';
import { coverLetterApi } from '@site/vacancy/app/infrastructure/cover-letter.api';

const MAX_CACHED_COVER_LETTERS = 20;

const isCharacterLengthPreset = (lengthPreset: CoverLetterLengthPreset): boolean => {
  return lengthPreset === 'min_chars' || lengthPreset === 'max_chars';
};

const cloneSpacingSettings = (settings: SpacingSettings): SpacingSettings => ({
  marginX: settings.marginX,
  marginY: settings.marginY,
  fontSize: settings.fontSize,
  lineHeight: settings.lineHeight,
  blockSpacing: settings.blockSpacing
});

export type CoverLetterEditorSnapshot = {
  contentMarkdown: string;
  subjectLine: string | null;
  formatSettings: SpacingSettings;
};

export type CoverLetterCacheItem = {
  id: string | null;
  vacancyId: string;
  generationId: string | null;
  language: CoverLetterGenerateBody['language'];
  type: CoverLetterGenerateBody['type'];
  tone: CoverLetterGenerateBody['tone'];
  lengthPreset: CoverLetterGenerateBody['lengthPreset'];
  characterLimit: number | null;
  recipientName: string;
  includeSubjectLine: boolean;
  instructions: string;
  subjectLine: string | null;
  contentMarkdown: string;
  formatSettings: SpacingSettings;
  createdAt: Date | null;
  updatedAt: Date | null;
};

const createDraftCoverLetter = (vacancyId: string): CoverLetterCacheItem => ({
  id: null,
  vacancyId,
  generationId: null,
  language: 'en',
  type: 'letter',
  tone: 'professional',
  lengthPreset: 'standard',
  characterLimit: null,
  recipientName: '',
  includeSubjectLine: false,
  instructions: '',
  subjectLine: null,
  contentMarkdown: '',
  formatSettings: cloneSpacingSettings(DefaultCoverLetterFormatSettings),
  createdAt: null,
  updatedAt: null
});

const toCoverLetterCacheItem = (coverLetter: CoverLetter): CoverLetterCacheItem => ({
  id: coverLetter.id,
  vacancyId: coverLetter.vacancyId,
  generationId: coverLetter.generationId,
  language: coverLetter.language,
  type: coverLetter.type,
  tone: coverLetter.tone,
  lengthPreset: coverLetter.lengthPreset,
  characterLimit: coverLetter.characterLimit,
  recipientName: coverLetter.recipientName ?? '',
  includeSubjectLine: coverLetter.includeSubjectLine,
  instructions: coverLetter.instructions ?? '',
  subjectLine: coverLetter.subjectLine,
  contentMarkdown: coverLetter.contentMarkdown,
  formatSettings: cloneSpacingSettings(coverLetter.formatSettings),
  createdAt: coverLetter.createdAt,
  updatedAt: coverLetter.updatedAt
});

const toGeneratePayload = (coverLetter: CoverLetterCacheItem): CoverLetterGenerateBody => ({
  language: coverLetter.language,
  type: coverLetter.type,
  tone: coverLetter.tone,
  lengthPreset: coverLetter.lengthPreset,
  characterLimit: isCharacterLengthPreset(coverLetter.lengthPreset)
    ? coverLetter.characterLimit
    : null,
  recipientName: normalizeNullableText(coverLetter.recipientName),
  includeSubjectLine: coverLetter.type === 'message' ? coverLetter.includeSubjectLine : false,
  instructions: normalizeNullableText(coverLetter.instructions)
});

const toEditorSnapshot = (coverLetter: CoverLetterCacheItem): CoverLetterEditorSnapshot => ({
  contentMarkdown: coverLetter.contentMarkdown,
  subjectLine: coverLetter.subjectLine,
  formatSettings: cloneSpacingSettings(coverLetter.formatSettings)
});

export const useVacancyCoverLetterStore = defineStore('VacancyCoverLetterStore', {
  state: (): {
    activeVacancyId: string | null;
    coverLetters: CoverLetterCacheItem[];
    coverLetterGenerating: boolean;
    coverLetterSaving: boolean;
    coverLetterSaveEpoch: number;
  } => ({
    activeVacancyId: null,
    coverLetters: [],
    coverLetterGenerating: false,
    coverLetterSaving: false,
    coverLetterSaveEpoch: 0
  }),

  getters: {
    getCoverLetters: (state): CoverLetterCacheItem[] => state.coverLetters,
    getCoverLetter: (state): CoverLetterCacheItem | null => {
      if (!state.activeVacancyId) return null;
      return state.coverLetters.find(entry => entry.vacancyId === state.activeVacancyId) ?? null;
    },
    getHasPersistedCoverLetter(): boolean {
      return Boolean(this.getCoverLetter?.id);
    },
    getCoverLetterGenerating: (state): boolean => state.coverLetterGenerating,
    getCoverLetterSaving: (state): boolean => state.coverLetterSaving,

    getCoverLetterGeneratePayload(): CoverLetterGenerateBody {
      const coverLetter = this.getCoverLetter;
      if (!coverLetter) {
        return toGeneratePayload(createDraftCoverLetter(''));
      }

      return toGeneratePayload(coverLetter);
    },

    getCoverLetterEditorSnapshot(): CoverLetterEditorSnapshot | null {
      const coverLetter = this.getCoverLetter;
      return coverLetter ? toEditorSnapshot(coverLetter) : null;
    }
  },

  actions: {
    _ensureCacheLimit(): void {
      if (this.coverLetters.length <= MAX_CACHED_COVER_LETTERS) return;
      this.coverLetters = this.coverLetters.slice(0, MAX_CACHED_COVER_LETTERS);
    },

    _ensureDraft(vacancyId: string): CoverLetterCacheItem {
      const existing = this.coverLetters.find(entry => entry.vacancyId === vacancyId);
      if (existing) return existing;

      const draft = createDraftCoverLetter(vacancyId);
      this.coverLetters.unshift(draft);
      this._ensureCacheLimit();
      return draft;
    },

    _upsertCoverLetter(coverLetter: CoverLetter): void {
      const nextCoverLetter = toCoverLetterCacheItem(coverLetter);
      const index = this.coverLetters.findIndex(entry => entry.vacancyId === coverLetter.vacancyId);

      if (index !== -1) {
        this.coverLetters[index] = nextCoverLetter;
        return;
      }

      this.coverLetters.unshift(nextCoverLetter);
      this._ensureCacheLimit();
    },

    _ensureVacancyContext(vacancyId: string): void {
      if (this.activeVacancyId !== vacancyId) {
        this.activeVacancyId = vacancyId;
        this.coverLetterSaveEpoch += 1;
        this.coverLetterSaving = false;
      }

      this._ensureDraft(vacancyId);
    },

    setActiveContext(vacancyId: string): void {
      this._ensureVacancyContext(vacancyId);
    },

    updateCurrentLanguage(language: CoverLetterGenerateBody['language']): void {
      const coverLetter = this.getCoverLetter;
      if (!coverLetter) return;
      coverLetter.language = language;
    },

    updateCurrentType(type: CoverLetterGenerateBody['type']): void {
      const coverLetter = this.getCoverLetter;
      if (!coverLetter) return;

      coverLetter.type = type;
      if (type !== 'message') {
        coverLetter.includeSubjectLine = false;
        coverLetter.characterLimit = null;
        if (isCharacterLengthPreset(coverLetter.lengthPreset)) {
          coverLetter.lengthPreset = 'standard';
        }
      }
    },

    updateCurrentTone(tone: CoverLetterGenerateBody['tone']): void {
      const coverLetter = this.getCoverLetter;
      if (!coverLetter) return;
      coverLetter.tone = tone;
    },

    updateCurrentLengthPreset(lengthPreset: CoverLetterGenerateBody['lengthPreset']): void {
      const coverLetter = this.getCoverLetter;
      if (!coverLetter) return;
      coverLetter.lengthPreset = lengthPreset;
      if (!isCharacterLengthPreset(lengthPreset)) {
        coverLetter.characterLimit = null;
      }
    },

    updateCurrentCharacterLimit(characterLimit: number | null): void {
      const coverLetter = this.getCoverLetter;
      if (!coverLetter) return;
      coverLetter.characterLimit = characterLimit;
    },

    updateCurrentRecipientName(recipientName: string): void {
      const coverLetter = this.getCoverLetter;
      if (!coverLetter) return;
      coverLetter.recipientName = recipientName;
    },

    updateCurrentIncludeSubjectLine(includeSubjectLine: boolean): void {
      const coverLetter = this.getCoverLetter;
      if (!coverLetter) return;
      coverLetter.includeSubjectLine = coverLetter.type === 'message' ? includeSubjectLine : false;
    },

    updateCurrentInstructions(instructions: string): void {
      const coverLetter = this.getCoverLetter;
      if (!coverLetter) return;
      coverLetter.instructions = instructions;
    },

    updateCurrentContentMarkdown(contentMarkdown: string): void {
      const coverLetter = this.getCoverLetter;
      if (!coverLetter) return;
      coverLetter.contentMarkdown = contentMarkdown;
    },

    updateCurrentSubjectLine(subjectLine: string | null): void {
      const coverLetter = this.getCoverLetter;
      if (!coverLetter) return;
      coverLetter.subjectLine = subjectLine;
    },

    updateCurrentFormatSetting(key: keyof SpacingSettings, value: number): void {
      const coverLetter = this.getCoverLetter;
      if (!coverLetter) return;
      coverLetter.formatSettings[key] = value;
    },

    setCurrentEditorSnapshot(snapshot: CoverLetterEditorSnapshot): void {
      const coverLetter = this.getCoverLetter;
      if (!coverLetter) return;

      coverLetter.contentMarkdown = snapshot.contentMarkdown;
      coverLetter.subjectLine = snapshot.subjectLine;
      coverLetter.formatSettings = cloneSpacingSettings(snapshot.formatSettings);
    },

    resetCurrentDraft(): void {
      const vacancyId = this.activeVacancyId;
      if (!vacancyId) return;

      const index = this.coverLetters.findIndex(entry => entry.vacancyId === vacancyId);
      if (index === -1) {
        this.coverLetters.unshift(createDraftCoverLetter(vacancyId));
        this._ensureCacheLimit();
        return;
      }

      this.coverLetters[index] = createDraftCoverLetter(vacancyId);
    },

    async fetchCoverLetter(vacancyId: string): Promise<CoverLetterCacheItem> {
      this._ensureVacancyContext(vacancyId);

      try {
        const response = await coverLetterApi.fetchLatest(vacancyId);
        const fetchedCoverLetter = response.coverLetter;

        if (fetchedCoverLetter) {
          this._upsertCoverLetter(fetchedCoverLetter);
        }

        return this.getCoverLetter ?? this._ensureDraft(vacancyId);
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to fetch cover letter');
      }
    },

    async generateCoverLetter(
      vacancyId: string,
      payload?: CoverLetterGenerateBody
    ): Promise<CoverLetterCacheItem> {
      this._ensureVacancyContext(vacancyId);
      this.coverLetterGenerating = true;

      try {
        const generatePayload = payload ?? this.getCoverLetterGeneratePayload;
        const coverLetter = await coverLetterApi.generate(vacancyId, generatePayload);
        this._upsertCoverLetter(coverLetter);
        return this.getCoverLetter ?? this._ensureDraft(vacancyId);
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to generate cover letter');
      } finally {
        this.coverLetterGenerating = false;
      }
    },

    async patchCurrentCoverLetter(
      payload: CoverLetterPatchBody
    ): Promise<CoverLetterCacheItem | null> {
      const coverLetter = this.getCoverLetter;
      if (!coverLetter?.id) return null;

      const saveEpoch = this.coverLetterSaveEpoch + 1;
      this.coverLetterSaveEpoch = saveEpoch;
      this.coverLetterSaving = true;

      try {
        const updated = await coverLetterApi.patch(coverLetter.id, payload);
        if (saveEpoch !== this.coverLetterSaveEpoch) {
          return null;
        }

        this._upsertCoverLetter(updated);
        return this.getCoverLetter;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to save cover letter');
      } finally {
        if (saveEpoch === this.coverLetterSaveEpoch) {
          this.coverLetterSaving = false;
        }
      }
    },

    $reset(): void {
      this.activeVacancyId = null;
      this.coverLetters = [];
      this.coverLetterGenerating = false;
      this.coverLetterSaving = false;
      this.coverLetterSaveEpoch = 0;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useVacancyCoverLetterStore, import.meta.hot));
}
