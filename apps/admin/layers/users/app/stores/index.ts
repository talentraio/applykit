export const useUsersStore = defineStore('UsersStore', {
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
  import.meta.hot.accept(acceptHMRUpdate(useUsersStore, import.meta.hot));
}
