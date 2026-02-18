import type {
  VacancyBulkDeleteModalClosePayload,
  VacancyDeleteModalClosePayload
} from '../../../../layers/vacancy/app/composables/useVacancyModals';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVacancyModals } from '../../../../layers/vacancy/app/composables/useVacancyModals';

vi.mock(
  '#components',
  () => ({
    LazyVacancyModalDeleteConfirmation: { name: 'VacancyModalDeleteConfirmation' },
    LazyVacancyModalBulkDeleteConfirmation: { name: 'VacancyModalBulkDeleteConfirmation' }
  }),
  { virtual: true }
);

type SetupOptions = {
  deleteOpenResult?: VacancyDeleteModalClosePayload | undefined;
  bulkDeleteOpenResult?: VacancyBulkDeleteModalClosePayload | undefined;
};

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

function setupUseVacancyModals(options: SetupOptions = {}) {
  const deleteOpen = vi.fn(async () => options.deleteOpenResult);
  const deleteClose = vi.fn();
  const deletePatch = vi.fn();
  const bulkDeleteOpen = vi.fn(async () => options.bulkDeleteOpenResult);
  const bulkDeleteClose = vi.fn();
  const bulkDeletePatch = vi.fn();

  const stateStore = new Map<string, { value: boolean }>();

  const createProgrammaticOverlay = (component: { name?: string } | undefined) => {
    if (component?.name === 'VacancyModalBulkDeleteConfirmation') {
      return {
        id: Symbol('vacancy-bulk-delete-modal'),
        open: bulkDeleteOpen,
        close: bulkDeleteClose,
        patch: bulkDeletePatch
      };
    }

    return {
      id: Symbol('vacancy-delete-modal'),
      open: deleteOpen,
      close: deleteClose,
      patch: deletePatch
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
    modals: useVacancyModals(),
    deleteOpen,
    deleteClose,
    bulkDeleteOpen,
    bulkDeleteClose
  };
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useVacancyModals', () => {
  it('opens single delete modal with vacancy id', async () => {
    const { modals, deleteOpen } = setupUseVacancyModals();

    await modals.openDeleteConfirmationModal('vacancy-1');

    expect(deleteOpen).toHaveBeenCalledTimes(1);
    expect(deleteOpen).toHaveBeenCalledWith({
      vacancyId: 'vacancy-1'
    });
  });

  it('opens bulk delete modal with selected vacancy ids', async () => {
    const { modals, bulkDeleteOpen } = setupUseVacancyModals();

    await modals.openBulkDeleteConfirmationModal(['a', 'b']);

    expect(bulkDeleteOpen).toHaveBeenCalledTimes(1);
    expect(bulkDeleteOpen).toHaveBeenCalledWith({
      vacancyIds: ['a', 'b']
    });
  });

  it('skips opening delete modal for empty vacancy id', async () => {
    const { modals, deleteOpen } = setupUseVacancyModals();

    const result = await modals.openDeleteConfirmationModal('');

    expect(deleteOpen).toHaveBeenCalledTimes(0);
    expect(result).toBeUndefined();
  });

  it('prevents duplicate bulk delete open while previous call is in progress', async () => {
    const { modals, bulkDeleteOpen } = setupUseVacancyModals();
    const deferred = createDeferred<VacancyBulkDeleteModalClosePayload | undefined>();
    bulkDeleteOpen.mockImplementationOnce(async () => deferred.promise);

    const firstOpen = modals.openBulkDeleteConfirmationModal(['id-1']);
    const secondOpen = modals.openBulkDeleteConfirmationModal(['id-2']);

    deferred.resolve(undefined);
    await firstOpen;
    const secondResult = await secondOpen;

    expect(bulkDeleteOpen).toHaveBeenCalledTimes(1);
    expect(secondResult).toBeUndefined();
  });

  it('closes both overlays through helper methods', async () => {
    const { modals, deleteOpen, bulkDeleteOpen, deleteClose, bulkDeleteClose } =
      setupUseVacancyModals();

    const deleteDeferred = createDeferred<VacancyDeleteModalClosePayload | undefined>();
    deleteOpen.mockImplementationOnce(async () => deleteDeferred.promise);
    const bulkDeleteDeferred = createDeferred<VacancyBulkDeleteModalClosePayload | undefined>();
    bulkDeleteOpen.mockImplementationOnce(async () => bulkDeleteDeferred.promise);

    const deletePromise = modals.openDeleteConfirmationModal('vacancy-1');
    const bulkDeletePromise = modals.openBulkDeleteConfirmationModal(['vacancy-1']);

    modals.closeDeleteConfirmationModal();
    modals.closeBulkDeleteConfirmationModal();

    expect(deleteClose).toHaveBeenCalledTimes(1);
    expect(bulkDeleteClose).toHaveBeenCalledTimes(1);

    deleteDeferred.resolve(undefined);
    bulkDeleteDeferred.resolve(undefined);
    await deletePromise;
    await bulkDeletePromise;
  });
});
