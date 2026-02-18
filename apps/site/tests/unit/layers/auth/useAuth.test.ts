import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '../../../../layers/auth/app/composables/useAuth';

vi.mock(
  '#components',
  () => ({
    LazyAuthModal: { name: 'AuthModal' },
    LazyAuthLegalConsentModal: { name: 'AuthLegalConsentModal' }
  }),
  { virtual: true }
);

vi.mock(
  'ofetch',
  () => ({
    FetchError: class FetchError extends Error {
      status?: number;
    }
  }),
  { virtual: true }
);

type QueryValue = string | string[] | undefined;
type Query = Record<string, QueryValue>;

type RouteStub = {
  query: Query;
};

type RouterPayload = {
  query?: Query;
};

type Getter<T> = () => T;

type ComputedOptions<T> = {
  get: Getter<T>;
  set?: (value: T) => void;
};

type StoreStub = {
  isAuthenticated: boolean;
  user: null;
  profile: null;
  loading: boolean;
  isProfileComplete: boolean;
  needsTermsAcceptance: boolean;
  logout: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  login: ReturnType<typeof vi.fn>;
  fetchMe: ReturnType<typeof vi.fn>;
  acceptTerms: ReturnType<typeof vi.fn>;
  eraseSessionData: ReturnType<typeof vi.fn>;
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

function createStoreStub(): StoreStub {
  return {
    isAuthenticated: false,
    user: null,
    profile: null,
    loading: false,
    isProfileComplete: false,
    needsTermsAcceptance: false,
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
    login: vi.fn(async () => undefined),
    fetchMe: vi.fn(async () => undefined),
    acceptTerms: vi.fn(async () => undefined),
    eraseSessionData: vi.fn()
  };
}

function setupUseAuth(query: Query = {}) {
  const route: RouteStub = {
    query: { ...query }
  };

  const push = vi.fn((payload: RouterPayload) => {
    if (payload.query) {
      route.query = { ...payload.query };
    }
  });
  const replace = vi.fn((payload: RouterPayload) => {
    if (payload.query) {
      route.query = { ...payload.query };
    }
  });

  const store = createStoreStub();
  const clear = vi.fn(async () => undefined);
  const fetch = vi.fn(async () => undefined);
  const navigateTo = vi.fn();
  const authOverlayOpen = vi.fn(async () => undefined);
  const authOverlayClose = vi.fn();
  const authOverlayPatch = vi.fn();
  const legalOverlayOpen = vi.fn(async () => undefined);
  const legalOverlayClose = vi.fn();
  const legalOverlayPatch = vi.fn();

  const stateStore = new Map<string, { value: boolean }>();

  vi.stubGlobal('computed', computedStub);
  vi.stubGlobal('useRouter', () => ({
    push,
    replace,
    currentRoute: {
      value: route
    }
  }));
  vi.stubGlobal('useAuthStore', () => store);
  vi.stubGlobal('useUserSession', () => ({ clear, fetch }));
  vi.stubGlobal('navigateTo', navigateTo);
  const createProgrammaticOverlay = (component: { name?: string } | undefined) => {
    if (component?.name === 'AuthLegalConsentModal') {
      return {
        id: Symbol('legal-overlay'),
        open: legalOverlayOpen,
        close: legalOverlayClose,
        patch: legalOverlayPatch
      };
    }

    return {
      id: Symbol('auth-overlay'),
      open: authOverlayOpen,
      close: authOverlayClose,
      patch: authOverlayPatch
    };
  };

  vi.stubGlobal('useProgrammaticOverlay', createProgrammaticOverlay);
  vi.stubGlobal('useState', (key: string, init: () => boolean) => {
    const existingState = stateStore.get(key);
    if (existingState) {
      return existingState;
    }

    const createdState = { value: init() };
    stateStore.set(key, createdState);
    return createdState;
  });

  return {
    auth: useAuth(),
    store,
    push,
    replace,
    navigateTo,
    authOverlayOpen,
    authOverlayClose,
    legalOverlayOpen,
    legalOverlayClose
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useAuth OAuth redirects', () => {
  it('passes safe redirect in Google OAuth state', () => {
    const { auth, navigateTo } = setupUseAuth({
      redirect: '/vacancies/42?tab=resume'
    });

    auth.loginWithGoogle();

    expect(navigateTo).toHaveBeenCalledWith('/auth/google?state=%2Fvacancies%2F42%3Ftab%3Dresume', {
      external: true
    });
  });

  it('passes safe redirect in LinkedIn OAuth state', () => {
    const { auth, navigateTo } = setupUseAuth({
      redirect: '/dashboard'
    });

    auth.loginWithLinkedIn();

    expect(navigateTo).toHaveBeenCalledWith('/auth/linkedin?state=%2Fdashboard', {
      external: true
    });
  });

  it.each([
    'https://example.com/phishing',
    '//example.com',
    'profile',
    'javascript:alert(1)',
    '/auth/google?state=%2Fresume',
    '/auth/linkedin?state=%2Fresume'
  ])('drops unsafe Google redirect value: %s', redirect => {
    const { auth, navigateTo } = setupUseAuth({ redirect });

    auth.loginWithGoogle();

    expect(navigateTo).toHaveBeenCalledWith('/auth/google', { external: true });
  });

  it('drops non-string redirect values', () => {
    const { auth, navigateTo } = setupUseAuth({
      redirect: ['/resume']
    });

    auth.loginWithGoogle();

    expect(navigateTo).toHaveBeenCalledWith('/auth/google', { external: true });
  });
});

describe('useAuth modal controls', () => {
  it('opens auth modal with default login view via query only', () => {
    const { auth, push, authOverlayOpen } = setupUseAuth({ foo: 'bar' });

    auth.openAuthModal();

    expect(push).toHaveBeenCalledWith({
      query: {
        foo: 'bar',
        auth: 'login'
      }
    });
    expect(authOverlayOpen).toHaveBeenCalledTimes(0);
  });

  it('opens auth modal with explicit view and redirect', () => {
    const { auth, push } = setupUseAuth({ foo: 'bar' });

    auth.openAuthModal('forgot', '/vacancies/42');

    expect(push).toHaveBeenCalledWith({
      query: {
        foo: 'bar',
        auth: 'forgot',
        redirect: '/vacancies/42'
      }
    });
  });

  it('switches auth modal view through router.replace only', () => {
    const { auth, replace, authOverlayOpen } = setupUseAuth({
      auth: 'login',
      redirect: '/resume'
    });

    auth.switchAuthModalView('register');

    expect(replace).toHaveBeenCalledWith({
      query: {
        auth: 'register',
        redirect: '/resume'
      }
    });
    expect(authOverlayOpen).toHaveBeenCalledTimes(0);
  });

  it('syncAuthModalFromQuery opens overlay for supported auth query', () => {
    const { auth, authOverlayOpen } = setupUseAuth();

    auth.syncAuthModalFromQuery({ auth: 'register' });

    expect(authOverlayOpen).toHaveBeenCalledTimes(1);
  });

  it('syncAuthModalFromQuery closes overlay for missing auth query', () => {
    const { auth, authOverlayClose } = setupUseAuth({ auth: 'login' });

    auth.syncAuthModalFromQuery({ auth: 'login' });
    auth.syncAuthModalFromQuery({});

    expect(authOverlayClose).toHaveBeenCalledTimes(1);
  });

  it('syncLegalConsentModal opens overlay when terms acceptance is required', () => {
    const { auth, store, legalOverlayOpen } = setupUseAuth();

    store.needsTermsAcceptance = true;
    auth.syncLegalConsentModal();

    expect(legalOverlayOpen).toHaveBeenCalledTimes(1);
  });

  it('syncLegalConsentModal closes overlay when terms acceptance is no longer required', () => {
    const { auth, store, legalOverlayClose } = setupUseAuth();

    store.needsTermsAcceptance = true;
    auth.syncLegalConsentModal();
    store.needsTermsAcceptance = false;
    auth.syncLegalConsentModal();

    expect(legalOverlayClose).toHaveBeenCalledTimes(1);
  });

  it('acceptTerms syncs legal consent overlay after successful acceptance', async () => {
    const { auth, store, legalOverlayClose } = setupUseAuth();

    store.needsTermsAcceptance = true;
    auth.syncLegalConsentModal();
    store.acceptTerms.mockImplementationOnce(async () => {
      store.needsTermsAcceptance = false;
      return undefined;
    });

    await auth.acceptTerms();

    expect(store.acceptTerms).toHaveBeenCalledTimes(1);
    expect(legalOverlayClose).toHaveBeenCalledTimes(1);
  });

  it('closes auth modal and removes auth+redirect query params', () => {
    const { auth, push, authOverlayClose } = setupUseAuth({
      auth: 'login',
      redirect: '/resume',
      foo: 'bar'
    });

    auth.openAuthModal();
    auth.closeAuthModal();

    expect(push).toHaveBeenLastCalledWith({
      query: {
        foo: 'bar'
      }
    });
    expect(authOverlayClose).toHaveBeenCalledTimes(0);
  });

  it('closeAuthModalAndRedirect navigates to redirect when present', () => {
    const { auth, navigateTo, authOverlayClose, push } = setupUseAuth({
      auth: 'login',
      redirect: '/profile'
    });

    auth.openAuthModal();
    auth.closeAuthModalAndRedirect();

    expect(navigateTo).toHaveBeenCalledWith('/profile');
    expect(push).toHaveBeenCalledTimes(1);
    expect(authOverlayClose).toHaveBeenCalledTimes(0);
  });

  it('closeAuthModalAndRedirect falls back to close when redirect is invalid', () => {
    const { auth, navigateTo, push } = setupUseAuth({
      auth: 'login',
      redirect: 'profile',
      foo: 'bar'
    });

    auth.openAuthModal();
    auth.closeAuthModalAndRedirect();

    expect(navigateTo).not.toHaveBeenCalled();
    expect(push).toHaveBeenLastCalledWith({
      query: {
        foo: 'bar'
      }
    });
  });
});
