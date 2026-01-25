export const useVacancyStore = defineStore('VacancyStore', {
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
  import.meta.hot.accept(acceptHMRUpdate(useVacancyStore, import.meta.hot));
}
