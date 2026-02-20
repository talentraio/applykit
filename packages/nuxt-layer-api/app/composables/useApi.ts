import type {
  ExtractedRouteMethod,
  NitroFetchOptions,
  NitroFetchRequest,
  TypedInternalResponse
} from 'nitropack';

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

  return await nuxtApp.$api(request, opts);
};
