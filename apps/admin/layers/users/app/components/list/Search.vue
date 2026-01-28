<template>
  <div class="users-list-search">
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

defineOptions({ name: 'UsersListSearch' });

const model = defineModel<string>({ default: '' });
</script>

<style lang="scss">
.users-list-search {
  // Reserved for component-specific styling
}
</style>
