export const useSystemStore = defineStore('SystemStore', {
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
  import.meta.hot.accept(acceptHMRUpdate(useSystemStore, import.meta.hot));
}
