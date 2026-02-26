import type { LoginInput, Profile, RegisterInput, Role, UserPublic } from '@int/schema';
import type { Pinia, Store } from 'pinia';
import { USER_ROLE_MAP } from '@int/schema';
import { parse } from 'date-fns';
import { getActivePinia } from 'pinia';
import { siteAuthApi } from '../infrastructure/auth.api';

/**
 * Compute current legal version from runtime config.
 * Returns the later of termsEffectiveDate and privacyEffectiveDate.
 */
const getCurrentLegalVersion = (): string => {
  const config = useRuntimeConfig();
  const { termsEffectiveDate, privacyEffectiveDate } = config.public.contentConfig;
  const termsDate = parse(termsEffectiveDate, 'dd.MM.yyyy', new Date());
  const privacyDate = parse(privacyEffectiveDate, 'dd.MM.yyyy', new Date());
  return termsDate >= privacyDate ? termsEffectiveDate : privacyEffectiveDate;
};

type ExtendedPinia = {
  _s: Map<string, Store>;
} & Pinia;

const getPiniaStoresMap = (): Map<string, Store> => {
  const pinia = getActivePinia() as ExtendedPinia | undefined;

  if (!pinia) {
    throw new Error('There is no stores');
  }

  return pinia._s;
};

const USER_ROOT_STORE_IDS = ['AuthStore', 'ProfileStore', 'ResumeStore', 'VacancyStore'] as const;

/**
 * Site Auth Store
 *
 * Manages authentication state for the site app.
 * Includes profile and legal consent tracking (site-specific).
 */
export const useAuthStore = defineStore('AuthStore', {
  state: (): {
    user: UserPublic | null;
    profile: Profile | null;
    isProfileComplete: boolean;
    loading: boolean;
    initialized: boolean;
  } => ({
    user: null,
    profile: null,
    isProfileComplete: false,
    loading: false,
    initialized: false
  }),

  getters: {
    isAuthenticated: (state): boolean => !!state.user,

    userRole: (state): Role => {
      return state.user?.role ?? USER_ROLE_MAP.PUBLIC;
    },

    /**
     * Whether the user needs to accept (or re-accept) terms.
     * Compares user's legalVersion against current effective legal version.
     */
    needsTermsAcceptance(): boolean {
      if (!this.user) return false;

      const userVersion = this.user.legalVersion;
      if (!userVersion) return true;

      return userVersion !== getCurrentLegalVersion();
    }
  },

  actions: {
    /**
     * Fetch current user and profile from server
     */
    async fetchMe() {
      this.loading = true;

      try {
        const { user, profile, isProfileComplete } = await siteAuthApi.fetchMe();
        this.user = user;
        this.profile = profile;
        this.isProfileComplete = isProfileComplete;
        this.initialized = true;
        return { user, profile };
      } catch (error) {
        this.user = null;
        this.profile = null;
        this.isProfileComplete = false;
        this.initialized = true;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Logout current user
     */
    async logout() {
      this.loading = true;

      try {
        await siteAuthApi.logout();
      } finally {
        this.loading = false;
      }
    },

    eraseSessionData() {
      this.user = null;
      this.profile = null;
      this.isProfileComplete = false;
    },

    resetUserStores() {
      const stores = getPiniaStoresMap();

      for (const storeId of USER_ROOT_STORE_IDS) {
        stores.get(storeId)?.$reset();
      }
    },

    /**
     * Accept terms of service and privacy policy
     */
    async acceptTerms() {
      const result = await siteAuthApi.acceptTerms(getCurrentLegalVersion());
      if (this.user) {
        this.user = {
          ...this.user,
          termsAcceptedAt: result.termsAcceptedAt ? new Date(result.termsAcceptedAt) : null,
          legalVersion: result.legalVersion ?? null
        };
      }
    },

    /**
     * Register with email/password and fetch user data
     */
    async register(input: RegisterInput) {
      await siteAuthApi.register(input);
      await this.fetchMe();
    },

    /**
     * Login with email/password and fetch user data
     */
    async login(input: LoginInput) {
      await siteAuthApi.login(input);
      await this.fetchMe();
    },

    /**
     * Update profile in store (after save)
     */
    setProfile(profile: Profile) {
      this.profile = profile;
    },

    $reset() {
      this.user = null;
      this.profile = null;
      this.isProfileComplete = false;
      this.loading = false;
      this.initialized = false;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
}
