import type { H3Event } from 'h3';
import { getRequestURL } from 'h3';

/**
 * Normalize a storage path for DB persistence.
 *
 * Storage drivers may return absolute URLs or `/api/storage/...` paths.
 * We always store `/storage/...` in the database.
 */
export const normalizeStoragePath = (value?: string | null): string | undefined => {
  if (!value) return undefined;

  // Absolute URL → extract pathname
  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const { pathname } = new URL(value);
      return pathname.replace('/api/storage/', '/storage/');
    } catch {
      return value;
    }
  }

  // Data/blob URLs → pass through
  if (value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }

  // Relative path → normalize prefix
  const path = value.startsWith('/') ? value : `/${value}`;
  return path.replace('/api/storage/', '/storage/');
};

/**
 * Build an absolute URL from a relative storage path for API responses.
 *
 * Takes the origin (protocol + host + port) from the current request.
 * Requires `host` header to be forwarded during SSR (see create-api.ts plugin).
 */
export const toAbsoluteStorageUrl = (event: H3Event, value?: string | null): string | undefined => {
  if (!value) return undefined;

  // Already absolute or special scheme → pass through
  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  ) {
    return value;
  }

  const url = getRequestURL(event, {
    xForwardedHost: true,
    xForwardedProto: true
  });

  const path = value.startsWith('/') ? value : `/${value}`;
  return `${url.origin}${path}`;
};
