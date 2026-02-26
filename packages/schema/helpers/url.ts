const HTTP_URL_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Returns true only for absolute HTTP(S) URLs.
 * Rejects scriptable protocols such as javascript: and data:.
 */
export function isSafeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return HTTP_URL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}
