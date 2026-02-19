import type { ProfileIncompleteModalClosePayload } from '../../../../layers/_base/app/composables/useProfileIncompleteModal';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProfileIncompleteModal } from '../../../../layers/_base/app/composables/useProfileIncompleteModal';

vi.mock(
  '#components',
  () => ({
    LazyProfileIncompleteModal: { name: 'ProfileIncompleteModal' }
  }),
  { virtual: true }
);

type SetupOptions = {
  openResult?: ProfileIncompleteModalClosePayload | undefined;
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

function setupUseProfileIncompleteModal(options: SetupOptions = {}) {
  const overlayOpen = vi.fn(async () => options.openResult);
  const overlayClose = vi.fn();
  const overlayPatch = vi.fn();
  const stateStore = new Map<string, { value: boolean }>();

  vi.stubGlobal('useProgrammaticOverlay', () => ({
    id: Symbol('profile-incomplete-modal'),
    open: overlayOpen,
    close: overlayClose,
    patch: overlayPatch
  }));

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
    modal: useProfileIncompleteModal(),
    overlayOpen,
    overlayClose
  };
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useProfileIncompleteModal', () => {
  it('opens modal with returnTo parameter', async () => {
    const { modal, overlayOpen } = setupUseProfileIncompleteModal();

    await modal.openProfileIncompleteModal({
      returnTo: '/vacancies/vacancy-1'
    });

    expect(overlayOpen).toHaveBeenCalledTimes(1);
    expect(overlayOpen).toHaveBeenCalledWith({
      returnTo: '/vacancies/vacancy-1'
    });
  });

  it('prevents duplicate open while previous call is in progress', async () => {
    const { modal, overlayOpen } = setupUseProfileIncompleteModal();
    const deferred = createDeferred<ProfileIncompleteModalClosePayload | undefined>();
    overlayOpen.mockImplementationOnce(async () => deferred.promise);

    const firstOpen = modal.openProfileIncompleteModal();
    const secondOpen = modal.openProfileIncompleteModal();

    deferred.resolve(undefined);
    await firstOpen;
    const secondResult = await secondOpen;

    expect(overlayOpen).toHaveBeenCalledTimes(1);
    expect(secondResult).toBeUndefined();
  });

  it('closes overlay through helper method', async () => {
    const { modal, overlayOpen, overlayClose } = setupUseProfileIncompleteModal();
    const deferred = createDeferred<ProfileIncompleteModalClosePayload | undefined>();
    overlayOpen.mockImplementationOnce(async () => deferred.promise);

    const openPromise = modal.openProfileIncompleteModal();

    modal.closeProfileIncompleteModal();

    expect(overlayClose).toHaveBeenCalledTimes(1);

    deferred.resolve(undefined);
    await openPromise;
  });
});
