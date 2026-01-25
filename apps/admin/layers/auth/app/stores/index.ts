export const useAuthStore = defineStore('AuthStore', {
  // state: (): {
  //   //
  // } => {
  //   return {
  //     //
  //   };
  // },
  // getters: {
  //   //
  // },
  // actions: {
  //   //
  // },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
}
