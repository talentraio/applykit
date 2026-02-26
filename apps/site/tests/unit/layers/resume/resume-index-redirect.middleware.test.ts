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

describe('resume-index-redirect middleware', () => {
  it('ignores routes other than /resume', async () => {
    const fetchResumeList = vi.fn();
    const navigateTo = vi.fn();

    vi.stubGlobal(
      'defineNuxtRouteMiddleware',
      (middleware: (to: RouteLike) => Promise<void>) => middleware
    );
    vi.stubGlobal('useResumeStore', () => ({
      fetchResumeList
    }));
    vi.stubGlobal('navigateTo', navigateTo);

    const module = await import('../../../../layers/resume/app/middleware/resume-index-redirect');
    const middleware = module.default;

    await middleware({ path: '/vacancies' });

    expect(fetchResumeList).not.toHaveBeenCalled();
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it('does not redirect when no resumes exist', async () => {
    const fetchResumeList = vi.fn(async () => []);
    const navigateTo = vi.fn();

    vi.stubGlobal(
      'defineNuxtRouteMiddleware',
      (middleware: (to: RouteLike) => Promise<void>) => middleware
    );
    vi.stubGlobal('useResumeStore', () => ({
      fetchResumeList
    }));
    vi.stubGlobal('navigateTo', navigateTo);

    const module = await import('../../../../layers/resume/app/middleware/resume-index-redirect');
    const middleware = module.default;

    await middleware({ path: '/resume' });

    expect(fetchResumeList).toHaveBeenCalledWith();
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it('redirects to default resume when it exists', async () => {
    const fetchResumeList = vi.fn(async () => [
      { id: 'resume-a', isDefault: false },
      { id: 'resume-default', isDefault: true }
    ]);
    const navigateTo = vi.fn();

    vi.stubGlobal(
      'defineNuxtRouteMiddleware',
      (middleware: (to: RouteLike) => Promise<void>) => middleware
    );
    vi.stubGlobal('useResumeStore', () => ({
      fetchResumeList
    }));
    vi.stubGlobal('navigateTo', navigateTo);

    const module = await import('../../../../layers/resume/app/middleware/resume-index-redirect');
    const middleware = module.default;

    await middleware({ path: '/resume' });

    expect(fetchResumeList).toHaveBeenCalledWith();
    expect(navigateTo).toHaveBeenCalledWith('/resume/resume-default', { replace: true });
  });

  it('redirects from /resume/ (trailing slash) to default resume', async () => {
    const fetchResumeList = vi.fn(async () => [{ id: 'resume-default', isDefault: true }]);
    const navigateTo = vi.fn();

    vi.stubGlobal(
      'defineNuxtRouteMiddleware',
      (middleware: (to: RouteLike) => Promise<void>) => middleware
    );
    vi.stubGlobal('useResumeStore', () => ({
      fetchResumeList
    }));
    vi.stubGlobal('navigateTo', navigateTo);

    const module = await import('../../../../layers/resume/app/middleware/resume-index-redirect');
    const middleware = module.default;

    await middleware({ path: '/resume/' });

    expect(fetchResumeList).toHaveBeenCalledWith();
    expect(navigateTo).toHaveBeenCalledWith('/resume/resume-default', { replace: true });
  });

  it('falls back to first resume when default is absent', async () => {
    const fetchResumeList = vi.fn(async () => [
      { id: 'resume-first', isDefault: false },
      { id: 'resume-second', isDefault: false }
    ]);
    const navigateTo = vi.fn();

    vi.stubGlobal(
      'defineNuxtRouteMiddleware',
      (middleware: (to: RouteLike) => Promise<void>) => middleware
    );
    vi.stubGlobal('useResumeStore', () => ({
      fetchResumeList
    }));
    vi.stubGlobal('navigateTo', navigateTo);

    const module = await import('../../../../layers/resume/app/middleware/resume-index-redirect');
    const middleware = module.default;

    await middleware({ path: '/resume' });

    expect(fetchResumeList).toHaveBeenCalledWith();
    expect(navigateTo).toHaveBeenCalledWith('/resume/resume-first', { replace: true });
  });
});
