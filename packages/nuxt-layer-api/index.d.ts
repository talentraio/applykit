import type { Role } from '@int/schema';

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

declare module '#auth-utils' {
  type User = {
    id: string;
    email: string;
    role: Role;
  };
}

// It is always important to ensure you import/export something when augmenting a type
export {};
