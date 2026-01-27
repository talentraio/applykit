import type { Role } from '@int/schema';

declare module 'nuxt/app' {
  interface NuxtApp {
    $api: typeof $fetch;
  }
}

declare module '#app' {
  interface NuxtApp {
    $api: typeof $fetch;
  }
}

declare module '#auth-utils' {
  interface User {
    id: string;
    email: string;
    role: Role;
  }
}

// It is always important to ensure you import/export something when augmenting a type
export {};
