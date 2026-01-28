<template>
  <div class="users-list-page-size-select">
    <UFormField :label="$t('admin.users.filters.pageSize')">
      <USelectMenu v-model="model" :items="sizeOptions" value-key="value" size="lg" />
    </UFormField>
  </div>
</template>

<script setup lang="ts">
/**
 * UserPageSizeSelect Component
 *
 * Controls page size for admin users list.
 */

defineOptions({ name: 'UsersListPageSizeSelect' });

const { t } = useI18n();

const model = defineModel<number>({ default: 25 });

const sizeOptions = computed<Array<{ label: string; value: number }>>(() => [
  { label: t('admin.users.filters.perPage', { count: 10 }), value: 10 },
  { label: t('admin.users.filters.perPage', { count: 25 }), value: 25 },
  { label: t('admin.users.filters.perPage', { count: 50 }), value: 50 },
  { label: t('admin.users.filters.perPage', { count: 100 }), value: 100 }
]);
</script>

<style lang="scss">
.users-list-page-size-select {
  // Reserved for component-specific styling
}
</style>
