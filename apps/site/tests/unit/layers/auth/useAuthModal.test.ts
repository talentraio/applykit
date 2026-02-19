import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAuthModal } from '../../../../layers/auth/app/components/modal/useAuthModal';

type Query = Record<string, string>;

type RouteStub = {
  query: Query;
};

type Getter<T> = () => T;

type ComputedOptions<T> = {
  get: Getter<T>;
  set?: (value: T) => void;
};

function computedStub<T>(source: Getter<T> | ComputedOptions<T>) {
  if (typeof source === 'function') {
    return {
      get value() {
        return source();
      }
    };
  }

  return {
    get value() {
      return source.get();
    },
    set value(value: T) {
      if (source.set) {
        source.set(value);
      }
    }
  };
}

function setupUseAuthModal(initialQuery: Query = {}) {
  const route: RouteStub = {
    query: { ...initialQuery }
  };

  const closeAuthModal = vi.fn();
  const closeAuthModalAndRedirect = vi.fn();
  const switchAuthModalView = vi.fn();

  vi.stubGlobal('computed', computedStub);
  vi.stubGlobal('useRoute', () => route);
  vi.stubGlobal('useAuth', () => ({
    closeAuthModal,
    closeAuthModalAndRedirect,
    switchAuthModalView
  }));

  return {
    modal: useAuthModal(),
    closeAuthModal,
    closeAuthModalAndRedirect,
    switchAuthModalView
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useAuthModal (internal)', () => {
  it('reads view and open state from query', () => {
    const { modal } = setupUseAuthModal({ auth: 'register' });

    expect(modal.view.value).toBe('register');
    expect(modal.isOpen.value).toBe(true);
  });

  it('returns null view for unsupported auth value', () => {
    const { modal } = setupUseAuthModal({ auth: 'unsupported' });

    expect(modal.view.value).toBe(null);
    expect(modal.isOpen.value).toBe(false);
  });

  it('returns redirectUrl only for app-relative paths', () => {
    const safe = setupUseAuthModal({ redirect: '/resume/123' });
    expect(safe.modal.redirectUrl.value).toBe('/resume/123');

    const unsafe = setupUseAuthModal({ redirect: 'https://example.com' });
    expect(unsafe.modal.redirectUrl.value).toBe(null);
  });

  it('delegates close/switch/closeAndRedirect to useAuth external API', () => {
    const { modal, closeAuthModal, closeAuthModalAndRedirect, switchAuthModalView } =
      setupUseAuthModal();

    modal.close();
    modal.closeAndRedirect();
    modal.switchView('forgot');

    expect(closeAuthModal).toHaveBeenCalledTimes(1);
    expect(closeAuthModalAndRedirect).toHaveBeenCalledTimes(1);
    expect(switchAuthModalView).toHaveBeenCalledWith('forgot');
  });
});
