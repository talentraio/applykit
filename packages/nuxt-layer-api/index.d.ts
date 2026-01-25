declare module 'nuxt/app' {
  // eslint-disable-next-line ts/consistent-type-definitions
  interface NuxtApp {
    $api: typeof $fetch;
  }
}

declare module '#app' {
  // eslint-disable-next-line ts/consistent-type-definitions
  interface NuxtApp {
    $api: typeof $fetch;
  }
}

// It is always important to ensure you import/export something when augmenting a type
export {};
