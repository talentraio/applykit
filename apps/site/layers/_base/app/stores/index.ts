import type { Pinia, Store } from 'pinia';
import { getActivePinia } from 'pinia';

type ExtendedPinia = {
  _s: Map<string, Store>;
} & Pinia;

export const useGlobalStore = defineStore('GlobalStore', {
  state: () => ({}),
  actions: {
    resetAllStores() {
      const pinia = getActivePinia() as ExtendedPinia;

      if (!pinia) {
        throw new Error('There is no stores');
      }

      pinia._s.forEach(store => store.$reset());
    }
  },
  getters: {}
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useGlobalStore, import.meta.hot));
}
