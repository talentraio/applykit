const TYPEGUARD_WARN_PREFIX = 'Typeguard warn!!!';

const warn = (message: string, isWarning: boolean): void => {
  if (!isWarning) {
    return;
  }

  console.warn(`${TYPEGUARD_WARN_PREFIX} ${message}`);
};

const isObjectLike = (value: unknown): value is object =>
  value !== null && (typeof value === 'object' || typeof value === 'function');

const getObjectPropValue = (obj: object, propertyName: PropertyKey): unknown =>
  Reflect.get(obj, propertyName);

export const hasProp = <T extends object, K extends PropertyKey>(
  obj: T,
  propertyName: K,
  isWarning = false
): obj is T & Record<K, unknown> => {
  const resolve = getObjectPropValue(obj, propertyName) !== undefined;

  if (!resolve) {
    warn(`The object has no property: ${String(propertyName)}`, isWarning);
  }

  return resolve;
};

export function getProp<T, K extends PropertyKey>(
  obj: T,
  propertyName: K
): T extends Record<K, infer V> ? V | undefined : undefined;

export function getProp<T, K extends PropertyKey, D>(
  obj: T,
  propertyName: K,
  defaultValue: D
): T extends Record<K, infer V> ? V | D : D;

export function getProp<T, K extends PropertyKey, D>(
  obj: T,
  propertyName: K,
  defaultValue?: D
): unknown {
  if (!isObjectLike(obj)) {
    return defaultValue;
  }

  const value = getObjectPropValue(obj, propertyName);
  return value !== undefined ? value : defaultValue;
}

export const hasProps = <T extends object>(
  obj: unknown,
  properties: ReadonlyArray<keyof T>,
  isWarning = false
): obj is T => {
  if (obj === null || typeof obj !== 'object') {
    warn('Value is not an object', isWarning);
    return false;
  }

  for (const prop of properties) {
    if (!(prop in obj)) {
      warn(`The object has no property: ${String(prop)}`, isWarning);
      return false;
    }
  }

  return true;
};

export const isObject = (value: unknown, isWarning = false): value is object => {
  const resolve = value !== null && typeof value === 'object' && !Array.isArray(value);

  if (!resolve) {
    warn(`The value: ${String(value)} is not an object`, isWarning);
  }

  return resolve;
};

export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

export const oneOf = <T extends string | number | boolean | null | undefined>(
  value: string | number | boolean | null | undefined,
  types: ReadonlyArray<T>
): value is T => {
  return types.some(type => Object.is(type, value));
};

export const isString = (value: unknown, isWarning = false): value is string => {
  const resolve = typeof value === 'string';

  if (!resolve) {
    warn(`The value: ${String(value)} is not a string`, isWarning);
  }

  return resolve;
};

export const isNumber = (value: unknown, isWarning = false): value is number => {
  const resolve = typeof value === 'number';

  if (!resolve) {
    warn(`The value: ${String(value)} is not a number`, isWarning);
  }

  return resolve;
};

export const isNumberString = (value: unknown, isWarning = false): value is number | string => {
  const resolve = typeof value === 'number' || typeof value === 'string';

  if (!resolve) {
    warn(`The value: ${String(value)} is not a number or string`, isWarning);
  }

  return resolve;
};

export const isBoolean = (value: unknown, isWarning = false): value is boolean => {
  const resolve = typeof value === 'boolean';

  if (!resolve) {
    warn(`The value: ${String(value)} is not a boolean`, isWarning);
  }

  return resolve;
};

export function isUndefined(value: unknown, invert: true, isWarning?: boolean): boolean;
export function isUndefined(
  value: unknown,
  invert?: false,
  isWarning?: boolean
): value is undefined;
export function isUndefined(value: unknown, invert = false, isWarning = false): boolean {
  const resolve = invert ? value !== undefined : value === undefined;

  if (!resolve) {
    const message = invert ? 'The value has undefined type' : 'The value is not undefined';

    warn(message, isWarning);
  }

  return resolve;
}

/**
 * Checks whether the type of `value` matches one of the types in `variants`.
 */
export const isValidUnion = <T>(value: unknown, variants: readonly T[]): value is T => {
  return variants.some(variant => Object.is(variant, value));
};

export const isHTMLElement = (element: unknown, isWarning = false): element is HTMLElement => {
  const canCheckDomType = typeof HTMLElement !== 'undefined';
  const resolve = canCheckDomType && element instanceof HTMLElement;

  if (!resolve) {
    warn('Value is not HTMLElement', isWarning);
  }

  return resolve;
};
