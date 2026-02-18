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
  componentName: string | null;
  overlay: OverlayFactory;
};

const overlayRegistry = new Map<string, OverlayRegistryEntry>();

function getComponentName(component: Component): string | null {
  const maybeComponent = component as {
    name?: unknown;
    __name?: unknown;
    displayName?: unknown;
  };

  if (typeof maybeComponent.name === 'string' && maybeComponent.name.length > 0) {
    return maybeComponent.name;
  }

  if (typeof maybeComponent.__name === 'string' && maybeComponent.__name.length > 0) {
    return maybeComponent.__name;
  }

  if (typeof maybeComponent.displayName === 'string' && maybeComponent.displayName.length > 0) {
    return maybeComponent.displayName;
  }

  return null;
}

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
    overlayRegistry.set(stableId, {
      component,
      componentName: getComponentName(component),
      overlay: createdOverlay
    });
    return createdOverlay;
  }

  if (cachedEntry.component !== component) {
    const cachedComponentName = cachedEntry.componentName;
    const nextComponentName = getComponentName(component);
    const isSameNamedComponent =
      cachedComponentName !== null &&
      nextComponentName !== null &&
      cachedComponentName === nextComponentName;

    if (isSameNamedComponent) {
      cachedEntry.component = component;
      cachedEntry.componentName = nextComponentName;
    } else {
      throw new Error(
        `Programmatic overlay id "${stableId}" is already registered with a different component`
      );
    }
  }

  if (!isOverlayMountedInMemory(cachedEntry.overlay.id)) {
    const recreatedOverlay = createOverlayFactory(component, options);
    overlayRegistry.set(stableId, {
      component,
      componentName: getComponentName(component),
      overlay: recreatedOverlay
    });
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
  let overlayFactory = resolveOverlayFactory(component, options);

  const getFactoryForOpen = (): OverlayFactory => {
    if (options.id) {
      overlayFactory = resolveOverlayFactory(component, options);
      return overlayFactory;
    }

    if (!isOverlayMountedInMemory(overlayFactory.id)) {
      overlayFactory = createOverlayFactory(component, options);
    }

    return overlayFactory;
  };

  const open = (props?: Partial<ExtractOverlayProps<TComponent>>): Promise<TResult> => {
    const factory = getFactoryForOpen();
    const mergedProps = mergeOverlayProps(options.defaultProps, props);
    return factory.open(mergedProps);
  };

  const close = (value?: TResult): void => {
    if (!isOverlayMountedInMemory(overlayFactory.id)) {
      return;
    }

    overlayFactory.close(value);
  };

  const patch = (props: Partial<ExtractOverlayProps<TComponent>>): void => {
    if (!isOverlayMountedInMemory(overlayFactory.id)) {
      return;
    }

    overlayFactory.patch(props);
  };

  return {
    get id() {
      return overlayFactory.id;
    },
    open,
    close,
    patch
  };
}
