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
