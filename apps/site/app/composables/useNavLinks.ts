export type NavLink = {
  label: string;
  to: string;
  icon?: string;
};

export const useNavLinks = (): ComputedRef<NavLink[]> => {
  const { t } = useI18n();

  return computed(() => [
    // TODO: temporary disabled
    // {
    //   label: t('nav.dashboard'),
    //   to: '/dashboard',
    //   icon: 'i-lucide-layout-dashboard'
    // },
    {
      label: t('nav.resume'),
      to: '/resume',
      icon: 'i-lucide-file-text'
    },
    {
      label: t('nav.vacancies'),
      to: '/vacancies',
      icon: 'i-lucide-briefcase'
    }
  ]);
};
