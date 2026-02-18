import type { Resume } from '@int/schema';
import type { ResumeUploadModalClosePayload } from '../../../../layers/resume/app/composables/useResumeModals';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useResumeModals } from '../../../../layers/resume/app/composables/useResumeModals';

vi.mock(
  '#components',
  () => ({
    LazyResumeModalUpload: { name: 'ResumeModalUpload' },
    LazyResumeModalCreateFromScratch: { name: 'ResumeModalCreateFromScratch' }
  }),
  { virtual: true }
);

type SetupOptions = {
  uploadOpenResult?: ResumeUploadModalClosePayload | undefined;
};

const createResumeFixture = (): Resume => ({
  id: '00000000-0000-4000-8000-000000000001',
  userId: '00000000-0000-4000-8000-000000000002',
  title: 'My Resume',
  content: {
    personalInfo: {
      fullName: 'Playwright Tester',
      email: 'tester@example.com'
    },
    experience: [],
    education: [],
    skills: [{ type: 'Skills', skills: ['Testing'] }]
  },
  sourceFileName: 'resume.docx',
  sourceFileType: 'docx',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z')
});

const createDeferred = <T>() => {
  let resolvePromise: (value: T) => void = () => undefined;
  const promise = new Promise<T>(resolve => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: resolvePromise
  };
};

function setupUseResumeModals(options: SetupOptions = {}) {
  const uploadOpen = vi.fn(async () => options.uploadOpenResult);
  const uploadClose = vi.fn();
  const uploadPatch = vi.fn();
  const createOpen = vi.fn(async () => undefined);
  const createClose = vi.fn();
  const createPatch = vi.fn();

  const stateStore = new Map<string, { value: boolean }>();

  const createProgrammaticOverlay = (component: { name?: string } | undefined) => {
    if (component?.name === 'ResumeModalCreateFromScratch') {
      return {
        id: Symbol('resume-create-modal'),
        open: createOpen,
        close: createClose,
        patch: createPatch
      };
    }

    return {
      id: Symbol('resume-upload-modal'),
      open: uploadOpen,
      close: uploadClose,
      patch: uploadPatch
    };
  };

  vi.stubGlobal('useProgrammaticOverlay', createProgrammaticOverlay);
  vi.stubGlobal('useState', (key: string, init: () => boolean) => {
    const existingState = stateStore.get(key);
    if (existingState) {
      return existingState;
    }

    const state = { value: init() };
    stateStore.set(key, state);
    return state;
  });

  return {
    modals: useResumeModals(),
    uploadOpen,
    uploadClose,
    createOpen,
    createClose
  };
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useResumeModals', () => {
  it('opens upload modal and forwards onError callback', async () => {
    const { modals, uploadOpen } = setupUseResumeModals();
    const onError = vi.fn();

    await modals.openUploadModal({ onError });

    expect(uploadOpen).toHaveBeenCalledTimes(1);
    expect(uploadOpen).toHaveBeenCalledWith({
      onError
    });
  });

  it('opens create-from-scratch modal after upload modal requests it', async () => {
    const { modals, createOpen } = setupUseResumeModals({
      uploadOpenResult: {
        action: 'create-from-scratch'
      }
    });

    await modals.openUploadFlow();

    expect(createOpen).toHaveBeenCalledTimes(1);
  });

  it('does not open create-from-scratch modal when upload succeeds', async () => {
    const { modals, createOpen } = setupUseResumeModals({
      uploadOpenResult: {
        action: 'uploaded',
        resume: createResumeFixture()
      }
    });

    await modals.openUploadFlow();

    expect(createOpen).toHaveBeenCalledTimes(0);
  });

  it('prevents duplicate upload modal open while previous call is in progress', async () => {
    const { modals, uploadOpen } = setupUseResumeModals();
    const deferred = createDeferred<ResumeUploadModalClosePayload | undefined>();
    uploadOpen.mockImplementationOnce(async () => deferred.promise);

    const firstOpen = modals.openUploadModal();
    const secondOpen = modals.openUploadModal();

    deferred.resolve(undefined);
    await firstOpen;
    const secondResult = await secondOpen;

    expect(uploadOpen).toHaveBeenCalledTimes(1);
    expect(secondResult).toBeUndefined();
  });

  it('closes overlays through helper methods', async () => {
    const { modals, uploadClose, createClose, uploadOpen, createOpen } = setupUseResumeModals();

    const uploadDeferred = createDeferred<ResumeUploadModalClosePayload | undefined>();
    uploadOpen.mockImplementationOnce(async () => uploadDeferred.promise);
    const createDeferredResult = createDeferred<undefined>();
    createOpen.mockImplementationOnce(async () => createDeferredResult.promise);

    const uploadPromise = modals.openUploadModal();
    const createPromise = modals.openCreateFromScratchModal();

    modals.closeUploadModal();
    modals.closeCreateFromScratchModal();

    expect(uploadClose).toHaveBeenCalledTimes(1);
    expect(createClose).toHaveBeenCalledTimes(1);

    uploadDeferred.resolve(undefined);
    createDeferredResult.resolve(undefined);
    await uploadPromise;
    await createPromise;
  });
});
