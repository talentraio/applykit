type DownloadPdfFileOptions = {
  fallbackFilename?: string;
  credentials?: RequestCredentials;
};

const DEFAULT_FALLBACK_FILENAME = 'document.pdf';

const getFilenameFromDisposition = (headerValue: string | null): string | null => {
  if (!headerValue) return null;

  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const fallbackMatch = headerValue.match(/filename="?([^";]+)"?/i);
  return fallbackMatch?.[1] ?? null;
};

export const usePdfDownload = () => {
  const downloadPdfFile = async (
    url: string,
    options: DownloadPdfFileOptions = {}
  ): Promise<string | null> => {
    if (!import.meta.client) return null;

    let contentDispositionHeader: string | null = null;
    const blob = await useApi<Blob>(url, {
      responseType: 'blob',
      credentials: options.credentials ?? 'include',
      onResponse: ({ response }) => {
        contentDispositionHeader = response.headers.get('content-disposition');
      }
    });

    const resolvedFilename =
      getFilenameFromDisposition(contentDispositionHeader) ??
      options.fallbackFilename ??
      DEFAULT_FALLBACK_FILENAME;

    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = resolvedFilename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

    return resolvedFilename;
  };

  return {
    downloadPdfFile
  };
};
