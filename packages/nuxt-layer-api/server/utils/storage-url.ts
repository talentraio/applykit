export const resolveStorageUrl = (value?: string | null): string | undefined => {
  if (!value) return undefined;

  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const url = new URL(value);
      if (url.pathname.startsWith('/api/storage/')) {
        return url.pathname.replace('/api/storage/', '/storage/');
      }
      if (url.pathname.startsWith('/storage/')) {
        return url.pathname;
      }
    } catch {
      return value;
    }
    return value;
  }

  if (value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }

  const normalized = value.startsWith('/') ? value : `/${value}`;

  if (normalized.startsWith('/api/storage/')) {
    return normalized.replace('/api/storage/', '/storage/');
  }

  return normalized;
};

export const appendCacheBuster = (value?: string | null, token?: string): string | undefined => {
  if (!value) return undefined;

  const cacheToken = token ?? Date.now().toString();
  try {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      const url = new URL(value);
      url.searchParams.set('v', cacheToken);
      return url.toString();
    }

    const url = new URL(value, 'http://local');
    url.searchParams.set('v', cacheToken);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return value;
  }
};
