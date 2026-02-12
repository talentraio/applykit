type AnyFunction = (...args: never[]) => unknown;

export type TValues<T> = T[keyof T];

/**
 * Return only data without methods
 * How to use:
 * type MyClassData = SerializedClass<MyClass>;
 */

export type SerializedClass<T> = T extends AnyFunction
  ? never
  : T extends Array<infer U>
    ? Array<SerializedClass<U>>
    : T extends object
      ? T extends { toJSON: () => infer R }
        ? SerializedClass<R>
        : {
            [K in keyof T as T[K] extends AnyFunction ? never : K]: SerializedClass<T[K]>;
          }
      : T;
