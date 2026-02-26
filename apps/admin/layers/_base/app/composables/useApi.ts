/**
 * Admin-specific `useApi()` override — adds centralized error handling.
 *
 * Feature: 016-errors-handling
 * App: apps/admin/
 *
 * Overrides the base `useApi()` from `@int/api` layer.
 * Nuxt auto-import resolution order: app-level composables win over layer composables.
 *
 * The caller can opt out of centralized error handling by providing their own `onResponseError`.
 */

import type {
  ExtractedRouteMethod,
  NitroFetchOptions,
  NitroFetchRequest,
  TypedInternalResponse
} from 'nitropack';
import { useAdminErrorHandler } from '../utils/admin-error-handler';

export const useApi = async <
  T = unknown,
  R extends NitroFetchRequest = NitroFetchRequest,
  O extends NitroFetchOptions<R> = NitroFetchOptions<R>
>(
  request: R,
  opts?: O
): Promise<
  TypedInternalResponse<R, T, NitroFetchOptions<R> extends O ? 'get' : ExtractedRouteMethod<R, O>>
> => {
  const nuxtApp = useNuxtApp();
  const errorHandler = useAdminErrorHandler();

  return await nuxtApp.$api(request, {
    ...opts,
    // Use centralized handler unless caller provides their own
    onResponseError: opts?.onResponseError ?? errorHandler
  } as O);
};
