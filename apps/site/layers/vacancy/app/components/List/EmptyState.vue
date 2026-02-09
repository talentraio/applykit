<template>
  <UPageCard class="vacancy-list-empty-state text-center">
    <div class="py-12">
      <div class="flex justify-center">
        <div
          class="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
        >
          <UIcon name="i-lucide-briefcase" class="h-10 w-10 text-muted" />
        </div>
      </div>

      <h3 class="mt-6 text-xl font-semibold">
        {{ $t('vacancy.list.empty') }}
      </h3>

      <p class="mt-2 text-muted">
        {{ $t('vacancy.list.emptyDescription') }}
      </p>

      <div class="mt-6">
        <UButton color="primary" icon="i-lucide-plus" size="lg" to="/vacancies/new">
          {{ $t('vacancy.list.createButton') }}
        </UButton>
      </div>
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
defineOptions({ name: 'VacancyListEmptyState' });
</script>
