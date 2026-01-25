export const useLandingStore = defineStore('LandingStore', {
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
  import.meta.hot.accept(acceptHMRUpdate(useLandingStore, import.meta.hot));
}
