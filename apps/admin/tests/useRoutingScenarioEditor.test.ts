import type { RoutingScenarioDraft } from '@admin/llm/app/components/routing/Scenarios/types';
import { LLM_SCENARIO_KEY_MAP } from '@int/schema';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vue', () => ({
  ref: <T>(value: T) => ({ value }),
  computed: <T>(getter: () => T) => ({
    get value() {
      return getter();
    }
  }),
  defineAsyncComponent: (loader: () => Promise<unknown>) => ({ __asyncLoader: loader })
}));

vi.mock('#components', () => ({
  LazyModalRoutingScenariosEdit: { name: 'ModalRoutingScenariosEdit' }
}));

type OverlayOpenProps = Record<string, unknown>;

type OverlayController = {
  id: symbol;
  open: (props?: OverlayOpenProps) => Promise<unknown>;
  close: (value?: unknown) => void;
  patch: (props: OverlayOpenProps) => void;
};

type OverlayStub = {
  controller: OverlayController;
  open: ReturnType<typeof vi.fn<OverlayController['open']>>;
  close: ReturnType<typeof vi.fn<OverlayController['close']>>;
};

function createOverlayStub(): OverlayStub {
  let resolveOpenPromise: ((value: unknown) => void) | null = null;

  const open = vi.fn<OverlayController['open']>(() => {
    return new Promise(resolve => {
      resolveOpenPromise = resolve;
    });
  });

  const close = vi.fn<OverlayController['close']>(value => {
    if (resolveOpenPromise) {
      const resolve = resolveOpenPromise;
      resolveOpenPromise = null;
      resolve(value);
    }
  });

  return {
    controller: {
      id: Symbol('routing-scenario-overlay'),
      open,
      close,
      patch: vi.fn()
    },
    open,
    close
  };
}

function createNuxtStateStub() {
  const states = new Map<string, { value: boolean }>();

  return (key: string, init: () => boolean) => {
    const existing = states.get(key);
    if (existing) {
      return existing;
    }

    const created = { value: init() };
    states.set(key, created);
    return created;
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isRoutingScenarioDraft = (value: unknown): value is RoutingScenarioDraft => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.primaryModelId === 'string' &&
    typeof value.secondaryModelId === 'string' &&
    typeof value.tertiaryModelId === 'string' &&
    typeof value.reasoningEffort === 'string' &&
    typeof value.strategyKey === 'string' &&
    typeof value.flowEnabled === 'boolean'
  );
};

const isBooleanGetter = (value: unknown): value is () => boolean => {
  return typeof value === 'function';
};

const isVoidFunction = (value: unknown): value is () => void => {
  return typeof value === 'function';
};

const createRef = <T>(value: T): { value: T } => ({ value });

async function loadComposable() {
  const module = await import('../layers/llm/app/composables/useRoutingScenarioEditor');
  return module.useRoutingScenarioEditor;
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useRoutingScenarioEditor', () => {
  it('reopens overlay after cancel close', async () => {
    const overlayStub = createOverlayStub();
    vi.stubGlobal('useProgrammaticOverlay', () => overlayStub.controller);
    vi.stubGlobal('useState', createNuxtStateStub());
    vi.stubGlobal('useI18n', () => ({
      t: (key: string) => key
    }));

    const useRoutingScenarioEditor = await loadComposable();

    const composable = useRoutingScenarioEditor({
      getSavedDraft: () => ({
        primaryModelId: 'model-a',
        secondaryModelId: 'model-b',
        tertiaryModelId: '',
        reasoningEffort: '',
        strategyKey: '',
        flowEnabled: true
      }),
      getDescription: () => 'Scenario description',
      getFormProps: () => ({ modelOptions: [] }),
      onSave: () => {}
    });

    composable.openScenarioEditor(LLM_SCENARIO_KEY_MAP.RESUME_PARSE);
    composable.closeScenarioEditor();
    await Promise.resolve();

    composable.openScenarioEditor(LLM_SCENARIO_KEY_MAP.RESUME_PARSE);

    expect(overlayStub.open).toHaveBeenCalledTimes(2);
  });

  it('opens the editor overlay and closes it with submitted payload', async () => {
    const overlayStub = createOverlayStub();
    vi.stubGlobal('useProgrammaticOverlay', () => overlayStub.controller);
    vi.stubGlobal('useState', createNuxtStateStub());
    vi.stubGlobal('useI18n', () => ({
      t: (key: string) => key
    }));

    const useRoutingScenarioEditor = await loadComposable();

    const composable = useRoutingScenarioEditor({
      getSavedDraft: () => ({
        primaryModelId: 'model-a',
        secondaryModelId: 'model-b',
        tertiaryModelId: '',
        reasoningEffort: '',
        strategyKey: '',
        flowEnabled: true
      }),
      getDescription: () => 'Scenario description',
      getFormProps: () => ({ modelOptions: [] }),
      onSave: () => {}
    });

    composable.openScenarioEditor(LLM_SCENARIO_KEY_MAP.RESUME_PARSE);

    expect(overlayStub.open).toHaveBeenCalledTimes(1);

    const firstOpenCall = overlayStub.open.mock.calls[0]?.[0];
    expect(isRecord(firstOpenCall)).toBe(true);
    if (!isRecord(firstOpenCall)) {
      return;
    }

    const draftValue = firstOpenCall.draft;
    expect(isRoutingScenarioDraft(draftValue)).toBe(true);
    if (!isRoutingScenarioDraft(draftValue)) {
      return;
    }

    draftValue.primaryModelId = 'model-c';
    expect(composable.modalDraft.value.primaryModelId).toBe('model-c');
    expect(composable.modalCanSave.value).toBe(true);

    composable.closeScenarioEditor({ action: 'submitted' });

    expect(overlayStub.close).toHaveBeenCalledWith({ action: 'submitted' });
    expect(composable.modalScenarioKey.value).toBe(null);
    expect(composable.modalDraft.value.primaryModelId).toBe('');

    await Promise.resolve();
  });

  it('calls onSave only when modal can be saved and saving is not active', async () => {
    const overlayStub = createOverlayStub();
    vi.stubGlobal('useProgrammaticOverlay', () => overlayStub.controller);
    vi.stubGlobal('useState', createNuxtStateStub());
    vi.stubGlobal('useI18n', () => ({
      t: (key: string) => key
    }));

    const saving = createRef(false);
    const onSave = vi.fn();

    const useRoutingScenarioEditor = await loadComposable();

    const composable = useRoutingScenarioEditor({
      getSavedDraft: () => ({
        primaryModelId: 'model-a',
        secondaryModelId: 'model-b',
        tertiaryModelId: '',
        reasoningEffort: '',
        strategyKey: '',
        flowEnabled: true
      }),
      getDescription: () => 'Scenario description',
      getFormProps: () => ({ modelOptions: [] }),
      hasRequiredValues: (_scenarioKey, draft) => {
        return Boolean(draft.primaryModelId && draft.secondaryModelId);
      },
      isSaving: saving,
      onSave
    });

    composable.openScenarioEditor(LLM_SCENARIO_KEY_MAP.RESUME_PARSE);

    const firstOpenCall = overlayStub.open.mock.calls[0]?.[0];
    expect(isRecord(firstOpenCall)).toBe(true);
    if (!isRecord(firstOpenCall)) {
      return;
    }

    const canSave = firstOpenCall.canSave;
    expect(isBooleanGetter(canSave)).toBe(true);

    const saveHandler = firstOpenCall.onSave;
    expect(isVoidFunction(saveHandler)).toBe(true);

    if (!isBooleanGetter(canSave) || !isVoidFunction(saveHandler)) {
      return;
    }

    expect(canSave()).toBe(false);
    saveHandler();
    expect(onSave).not.toHaveBeenCalled();

    composable.modalDraft.value.primaryModelId = 'model-c';
    expect(canSave()).toBe(true);

    saveHandler();
    expect(onSave).toHaveBeenCalledTimes(1);

    saving.value = true;
    saveHandler();
    expect(onSave).toHaveBeenCalledTimes(1);

    composable.closeScenarioEditor();
    await Promise.resolve();
  });
});
