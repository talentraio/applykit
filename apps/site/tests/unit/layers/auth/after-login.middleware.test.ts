import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type RouteLike = {
  path: string;
};

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('after-login.global middleware', () => {
  it('ignores routes other than resolver path', async () => {
    const navigateTo = vi.fn();
    const fetchVacanciesPaginated = vi.fn();

    vi.stubGlobal(
      'defineNuxtRouteMiddleware',
      (middleware: (to: RouteLike) => Promise<void>) => middleware
    );
    vi.stubGlobal('useAppConfig', () => ({
      redirects: {
        postLogin: {
          resolver: '/auth/post-login',
          hasVacancies: '/vacancies',
          noVacancies: '/resume',
          fallback: '/resume'
        }
      }
    }));
    vi.stubGlobal('useUserSession', () => ({
      loggedIn: { value: true }
    }));
    vi.stubGlobal('useVacancyStore', () => ({
      fetchVacanciesPaginated
    }));
    vi.stubGlobal('navigateTo', navigateTo);

    const module = await import('../../../../layers/auth/app/middleware/after-login.global');
    const middleware = module.default;

    await middleware({ path: '/resume' });

    expect(fetchVacanciesPaginated).not.toHaveBeenCalled();
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it('does nothing for unauthenticated users on resolver path', async () => {
    const navigateTo = vi.fn();
    const fetchVacanciesPaginated = vi.fn();

    vi.stubGlobal(
      'defineNuxtRouteMiddleware',
      (middleware: (to: RouteLike) => Promise<void>) => middleware
    );
    vi.stubGlobal('useAppConfig', () => ({
      redirects: {
        postLogin: {
          resolver: '/auth/post-login',
          hasVacancies: '/vacancies',
          noVacancies: '/resume',
          fallback: '/resume'
        }
      }
    }));
    vi.stubGlobal('useUserSession', () => ({
      loggedIn: { value: false }
    }));
    vi.stubGlobal('useVacancyStore', () => ({
      fetchVacanciesPaginated
    }));
    vi.stubGlobal('navigateTo', navigateTo);

    const module = await import('../../../../layers/auth/app/middleware/after-login.global');
    const middleware = module.default;

    await middleware({ path: '/auth/post-login' });

    expect(fetchVacanciesPaginated).not.toHaveBeenCalled();
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it('redirects to vacancies when at least one vacancy exists', async () => {
    const navigateTo = vi.fn();
    const fetchVacanciesPaginated = vi.fn(async () => ({
      pagination: { totalItems: 1 }
    }));

    vi.stubGlobal(
      'defineNuxtRouteMiddleware',
      (middleware: (to: RouteLike) => Promise<void>) => middleware
    );
    vi.stubGlobal('useAppConfig', () => ({
      redirects: {
        postLogin: {
          resolver: '/auth/post-login',
          hasVacancies: '/vacancies',
          noVacancies: '/resume',
          fallback: '/resume'
        }
      }
    }));
    vi.stubGlobal('useUserSession', () => ({
      loggedIn: { value: true }
    }));
    vi.stubGlobal('useVacancyStore', () => ({
      fetchVacanciesPaginated
    }));
    vi.stubGlobal('navigateTo', navigateTo);

    const module = await import('../../../../layers/auth/app/middleware/after-login.global');
    const middleware = module.default;

    await middleware({ path: '/auth/post-login' });

    expect(fetchVacanciesPaginated).toHaveBeenCalledWith({ currentPage: 1, pageSize: 1 });
    expect(navigateTo).toHaveBeenCalledWith('/vacancies', { replace: true });
  });

  it('falls back to fallback path when vacancies fetch fails', async () => {
    const navigateTo = vi.fn();
    const fetchVacanciesPaginated = vi.fn(async () => {
      throw new TypeError('network');
    });

    vi.stubGlobal(
      'defineNuxtRouteMiddleware',
      (middleware: (to: RouteLike) => Promise<void>) => middleware
    );
    vi.stubGlobal('useAppConfig', () => ({
      redirects: {
        postLogin: {
          resolver: '/auth/post-login',
          hasVacancies: '/vacancies',
          noVacancies: '/resume',
          fallback: '/resume'
        }
      }
    }));
    vi.stubGlobal('useUserSession', () => ({
      loggedIn: { value: true }
    }));
    vi.stubGlobal('useVacancyStore', () => ({
      fetchVacanciesPaginated
    }));
    vi.stubGlobal('navigateTo', navigateTo);

    const module = await import('../../../../layers/auth/app/middleware/after-login.global');
    const middleware = module.default;

    await middleware({ path: '/auth/post-login' });

    expect(navigateTo).toHaveBeenCalledWith('/resume', { replace: true });
  });
});
