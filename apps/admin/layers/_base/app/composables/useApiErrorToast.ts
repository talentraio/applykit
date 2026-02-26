/**
 * Admin-specific API error toast helper.
 *
 * Uses NuxtUI `useToast()` + `useI18n()` to show localized
 * API error notifications.
 */
const KNOWN_STATUS_CODES = new Set([401, 403, 429, 500, 502, 503]);

export const useApiErrorToast = () => {
  const toast = useToast();
  const { t, te } = useI18n();

  const showErrorToast = (error: ApiError): void => {
    const statusKey = `errors.api.${error.status}`;
    const genericKey = 'errors.api.generic';

    const titleKey =
      KNOWN_STATUS_CODES.has(error.status) && te(`${statusKey}.title`)
        ? `${statusKey}.title`
        : `${genericKey}.title`;

    const descriptionKey =
      KNOWN_STATUS_CODES.has(error.status) && te(`${statusKey}.description`)
        ? `${statusKey}.description`
        : `${genericKey}.description`;

    toast.add({
      title: t(titleKey),
      description: t(descriptionKey),
      color: 'error'
    });
  };

  return { showErrorToast };
};
