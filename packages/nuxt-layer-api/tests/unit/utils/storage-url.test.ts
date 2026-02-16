import { beforeAll, describe, expect, it, vi } from 'vitest';

let normalizeStoragePath: (value?: string | null) => string | undefined;

beforeAll(async () => {
  vi.mock('h3', () => ({
    getRequestURL: () => new URL('http://localhost:3000')
  }));

  ({ normalizeStoragePath } = await import('../../../server/utils/storage-url'));
});

describe('normalizeStoragePath', () => {
  it('normalizes relative /api/storage path to /storage', () => {
    expect(normalizeStoragePath('/api/storage/photos/user/image.jpg')).toBe(
      '/storage/photos/user/image.jpg'
    );
  });

  it('normalizes absolute local /api/storage URL to /storage path', () => {
    expect(
      normalizeStoragePath('https://applykit-site.vercel.app/api/storage/photos/user/image.jpg')
    ).toBe('/storage/photos/user/image.jpg');
  });

  it('keeps external absolute URL intact', () => {
    const blobUrl = 'https://abc123.public.blob.vercel-storage.com/photos/user/profile-123.jpg';

    expect(normalizeStoragePath(blobUrl)).toBe(blobUrl);
  });

  it('keeps data/blob URLs intact', () => {
    const dataUrl = 'data:image/webp;base64,abc';
    const objectUrl = 'blob:https://applykit-site.vercel.app/12345';

    expect(normalizeStoragePath(dataUrl)).toBe(dataUrl);
    expect(normalizeStoragePath(objectUrl)).toBe(objectUrl);
  });
});
