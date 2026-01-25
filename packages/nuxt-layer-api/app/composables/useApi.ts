/**
 * Typed API client composable
 *
 * Thin wrapper around $api plugin that preserves full type inference from Nitro API routes.
 *
 * Usage:
 * ```ts
 * const data = await useApi('/api/resumes') // infers Resume[] from endpoint
 * ```
 */
export const useApi = <
  T = unknown,
  R extends string = string,
  O extends Record<string, any> = Record<string, any>
>(
  ...args: Parameters<typeof $fetch<T, R, O>>
): ReturnType<typeof $fetch<T, R, O>> => {
  const nuxtApp = useNuxtApp();
  return nuxtApp.$api(...args);
};
