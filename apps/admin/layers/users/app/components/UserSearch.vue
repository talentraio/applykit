<template>
  <div class="users-user-search">
    <UFormField :label="$t('admin.users.search')">
      <UInput
        v-model="model"
        :placeholder="$t('admin.users.search')"
        icon="i-lucide-search"
        size="lg"
      />
    </UFormField>
  </div>
</template>

<script setup lang="ts">
/**
 * UserSearch Component
 *
 * Search input for filtering users by email.
 *
 * Related: T137 (US8)
 */

defineOptions({ name: 'UsersUserSearch' });

const model = defineModel<string>({ default: '' });
</script>

<style lang="scss">
.users-user-search {
  // Reserved for component-specific styling
}
</style>
