import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type OverlayCreateOptions = {
  props?: Record<string, unknown>;
  destroyOnClose?: boolean;
};

type CreatedOverlay = {
  component: unknown;
  options: OverlayCreateOptions;
  id: symbol;
  open: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
};

function createOverlayStub() {
  const overlays: Array<{ id: symbol }> = [];
  const createdOverlays: CreatedOverlay[] = [];

  const create = vi.fn((component: unknown, options: OverlayCreateOptions = {}) => {
    const id = Symbol('overlay');
    const open = vi.fn(async (props?: Record<string, unknown>) => props ?? null);
    const close = vi.fn((value?: unknown) => {
      if (options.destroyOnClose) {
        const index = overlays.findIndex(overlay => overlay.id === id);
        if (index >= 0) {
          overlays.splice(index, 1);
        }
      }

      return value;
    });
    const patch = vi.fn((props: Record<string, unknown>) => props);

    overlays.push({ id });
    createdOverlays.push({ component, options, id, open, close, patch });

    return {
      id,
      open,
      close,
      patch
    };
  });

  return {
    overlay: {
      create,
      overlays
    },
    create,
    createdOverlays
  };
}

async function loadComposable() {
  const module = await import('../app/composables/useProgrammaticOverlay');
  return module.useProgrammaticOverlay;
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useProgrammaticOverlay', () => {
  it('forwards create options and merges open props with defaults', async () => {
    const overlayStub = createOverlayStub();
    vi.stubGlobal('useOverlay', () => overlayStub.overlay);

    const useProgrammaticOverlay = await loadComposable();
    const component = { name: 'AuthModal' };

    const modal = useProgrammaticOverlay(component, {
      defaultProps: {
        view: 'login',
        redirect: '/resume'
      },
      destroyOnClose: true
    });

    const result = await modal.open({ view: 'register' });

    expect(overlayStub.create).toHaveBeenCalledWith(component, {
      destroyOnClose: true
    });
    expect(overlayStub.createdOverlays[0]?.open).toHaveBeenCalledWith({
      view: 'register',
      redirect: '/resume'
    });
    expect(result).toEqual({
      view: 'register',
      redirect: '/resume'
    });
  });

  it('proxies close and patch calls to the overlay factory', async () => {
    const overlayStub = createOverlayStub();
    vi.stubGlobal('useOverlay', () => overlayStub.overlay);

    const useProgrammaticOverlay = await loadComposable();
    const modal = useProgrammaticOverlay({ name: 'AuthModal' });

    modal.patch({ view: 'forgot' });
    modal.close('closed');

    expect(overlayStub.createdOverlays[0]?.patch).toHaveBeenCalledWith({ view: 'forgot' });
    expect(overlayStub.createdOverlays[0]?.close).toHaveBeenCalledWith('closed');
  });

  it('reuses existing factory for the same stable id', async () => {
    const overlayStub = createOverlayStub();
    vi.stubGlobal('useOverlay', () => overlayStub.overlay);

    const useProgrammaticOverlay = await loadComposable();
    const component = { name: 'AuthModal' };

    const first = useProgrammaticOverlay(component, { id: 'auth-modal' });
    const second = useProgrammaticOverlay(component, { id: 'auth-modal' });

    expect(overlayStub.create).toHaveBeenCalledTimes(1);
    expect(first.id).toBe(second.id);
  });

  it('throws when the same stable id is used with another component', async () => {
    const overlayStub = createOverlayStub();
    vi.stubGlobal('useOverlay', () => overlayStub.overlay);

    const useProgrammaticOverlay = await loadComposable();

    useProgrammaticOverlay({ name: 'AuthModal' }, { id: 'auth-modal' });

    expect(() => {
      useProgrammaticOverlay({ name: 'AnotherModal' }, { id: 'auth-modal' });
    }).toThrow('already registered with a different component');
  });

  it('recreates overlay for stable id when previous instance was destroyed', async () => {
    const overlayStub = createOverlayStub();
    vi.stubGlobal('useOverlay', () => overlayStub.overlay);

    const useProgrammaticOverlay = await loadComposable();
    const component = { name: 'AuthModal' };

    const first = useProgrammaticOverlay(component, {
      id: 'auth-modal',
      destroyOnClose: true
    });
    first.close();

    const second = useProgrammaticOverlay(component, {
      id: 'auth-modal',
      destroyOnClose: true
    });

    expect(overlayStub.create).toHaveBeenCalledTimes(2);
    expect(first.id).not.toBe(second.id);
  });
});
