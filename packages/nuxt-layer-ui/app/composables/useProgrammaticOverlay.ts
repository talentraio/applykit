import type { Component } from 'vue';

type OverlayProps = Record<string, unknown>;

type ExtractOverlayProps<TComponent extends Component> = TComponent extends new (
  ...args: never[]
) => { $props: infer Props }
  ? Props extends OverlayProps
    ? Props
    : OverlayProps
  : OverlayProps;

type OverlayFactory = ReturnType<ReturnType<typeof useOverlay>['create']>;

type ExtractOverlayEmit<TComponent extends Component> = TComponent extends new (
  ...args: never[]
) => { $emit: infer Emit }
  ? Emit
  : never;

type CloseEventArgTypeSimple<T> = T extends (
  event: 'close',
  arg_0: infer Arg,
  ...args: unknown[]
) => void
  ? Arg
  : never;

/**
 * Workaround for overloaded emits signatures:
 * conditional types match only one overload, so we widen to extract close payload.
 */
type CloseEventArgTypeComplex<T> = T extends {
  (event: 'close', arg_0: infer Arg, ...args: unknown[]): void;
  (...args: unknown[]): void;
  (...args: unknown[]): void;
  (...args: unknown[]): void;
  (...args: unknown[]): void;
  (...args: unknown[]): void;
  (...args: unknown[]): void;
  (...args: unknown[]): void;
  (...args: unknown[]): void;
  (...args: unknown[]): void;
  (...args: unknown[]): void;
  (...args: unknown[]): void;
  (...args: unknown[]): void;
  (...args: unknown[]): void;
  (...args: unknown[]): void;
  (...args: unknown[]): void;
  (...args: unknown[]): void;
}
  ? Arg
  : never;

type OverlayClosePayload<TComponent extends Component> =
  | CloseEventArgTypeSimple<ExtractOverlayEmit<TComponent>>
  | CloseEventArgTypeComplex<ExtractOverlayEmit<TComponent>>;

type NormalizeOverlayClosePayload<TComponent extends Component> = [
  OverlayClosePayload<TComponent>
] extends [never]
  ? unknown
  : OverlayClosePayload<TComponent>;

type OverlayRegistryEntry = {
  component: Component;
  overlay: OverlayFactory;
};

const overlayRegistry = new Map<string, OverlayRegistryEntry>();

export type UseProgrammaticOverlayOptions<TComponent extends Component> = {
  defaultProps?: Partial<ExtractOverlayProps<TComponent>>;
  id?: string;
  destroyOnClose?: boolean;
};

export type ProgrammaticOverlayController<
  TProps extends OverlayProps = OverlayProps,
  TResult = unknown
> = {
  id: symbol;
  open: (props?: Partial<TProps>) => Promise<TResult>;
  close: (value?: TResult) => void;
  patch: (props: Partial<TProps>) => void;
};

function mergeOverlayProps<TProps extends OverlayProps>(
  defaultProps?: Partial<TProps>,
  nextProps?: Partial<TProps>
): Partial<TProps> | undefined {
  const mergedProps: Partial<TProps> = {};

  if (defaultProps) {
    Object.assign(mergedProps, defaultProps);
  }

  if (nextProps) {
    Object.assign(mergedProps, nextProps);
  }

  return Object.keys(mergedProps).length > 0 ? mergedProps : undefined;
}

function createOverlayFactory<TComponent extends Component>(
  component: TComponent,
  options: UseProgrammaticOverlayOptions<TComponent>
): OverlayFactory {
  const overlay = useOverlay();

  return overlay.create(component, {
    destroyOnClose: options.destroyOnClose
  });
}

function isOverlayMountedInMemory(overlayId: symbol): boolean {
  const overlay = useOverlay();
  return overlay.overlays.some(currentOverlay => currentOverlay.id === overlayId);
}

function resolveOverlayFactory<TComponent extends Component>(
  component: TComponent,
  options: UseProgrammaticOverlayOptions<TComponent>
): OverlayFactory {
  const stableId = options.id;
  if (!stableId) {
    return createOverlayFactory(component, options);
  }

  const cachedEntry = overlayRegistry.get(stableId);
  if (!cachedEntry) {
    const createdOverlay = createOverlayFactory(component, options);
    overlayRegistry.set(stableId, { component, overlay: createdOverlay });
    return createdOverlay;
  }

  if (cachedEntry.component !== component) {
    throw new Error(
      `Programmatic overlay id "${stableId}" is already registered with a different component`
    );
  }

  if (!isOverlayMountedInMemory(cachedEntry.overlay.id)) {
    const recreatedOverlay = createOverlayFactory(component, options);
    overlayRegistry.set(stableId, { component, overlay: recreatedOverlay });
    return recreatedOverlay;
  }

  return cachedEntry.overlay;
}

/**
 * Thin helper over Nuxt UI `useOverlay`:
 * - first argument: sync or lazy modal/slideover component
 * - second argument: default props + optional stable id + destroyOnClose
 */
export function useProgrammaticOverlay<
  TComponent extends Component,
  TResult = NormalizeOverlayClosePayload<TComponent>
>(
  component: TComponent,
  options: UseProgrammaticOverlayOptions<TComponent> = {}
): ProgrammaticOverlayController<ExtractOverlayProps<TComponent>, TResult> {
  const overlayFactory = resolveOverlayFactory(component, options);

  const open = (props?: Partial<ExtractOverlayProps<TComponent>>): Promise<TResult> => {
    const mergedProps = mergeOverlayProps(options.defaultProps, props);
    return overlayFactory.open(mergedProps);
  };

  const close = (value?: TResult): void => {
    overlayFactory.close(value);
  };

  const patch = (props: Partial<ExtractOverlayProps<TComponent>>): void => {
    overlayFactory.patch(props);
  };

  return {
    id: overlayFactory.id,
    open,
    close,
    patch
  };
}
