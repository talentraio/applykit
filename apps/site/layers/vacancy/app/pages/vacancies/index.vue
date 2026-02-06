<template>
  <div class="vacancy-list-page container mx-auto max-w-4xl p-4 py-8">
    <!-- Header -->
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">
          {{ $t('vacancy.list.title') }}
        </h1>
        <p v-if="vacancies.length > 0" class="mt-2 text-muted">
          {{ $t('vacancy.list.count', { count: vacancies.length }) }}
        </p>
      </div>
      <UButton color="primary" icon="i-lucide-plus" size="lg" to="/vacancies/new">
        {{ $t('vacancy.list.createButton') }}
      </UButton>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
    </div>

    <template v-else-if="error">
      <!-- Error State -->
      <UAlert
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="$t('vacancy.error.fetchFailed')"
        :description="error.message"
      />
    </template>

    <UPageCard v-else-if="vacancies.length === 0" class="text-center">
      <!-- Empty State -->
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

    <template v-else>
      <!-- Vacancies List -->
      <div class="space-y-2">
        <VacancyListRow
          v-for="vacancy in displayedVacancies"
          :key="vacancy.id"
          :vacancy="vacancy"
          @click="viewVacancy(vacancy.id)"
          @edit="editVacancy(vacancy.id)"
          @delete="confirmDelete(vacancy)"
        />
      </div>

      <!-- Desktop: Pagination (only show when more than one page) -->
      <div v-if="totalPages > 1" class="mt-6 hidden items-center justify-between md:flex">
        <!-- Page size selector -->
        <div class="flex items-center gap-2">
          <span class="text-sm text-muted">{{ $t('vacancy.list.perPage') }}</span>
          <USelect v-model="pageSize" :items="pageSizeOptions" class="w-20" size="sm" />
        </div>

        <!-- Pagination buttons -->
        <UPagination
          v-model:page="currentPage"
          :items-per-page="pageSize"
          :total="vacancies.length"
          :sibling-count="1"
          show-edges
        />
      </div>

      <!-- Mobile: Infinite scroll loading indicator -->
      <div
        v-if="isMobile && hasMoreItems"
        ref="loadMoreRef"
        class="flex justify-center py-4 md:hidden"
      >
        <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-muted" />
      </div>

      <!-- Mobile: All loaded indicator (show only if we scrolled and loaded all) -->
      <div
        v-if="isMobile && !hasMoreItems && mobileItemsLoaded > 10"
        class="py-4 text-center md:hidden"
      >
        <p class="text-sm text-muted">{{ $t('vacancy.list.allLoaded') }}</p>
      </div>
    </template>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="isDeleteModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-alert-triangle" class="h-6 w-6 text-error" />
              <h3 class="text-lg font-semibold">
                {{ $t('vacancy.delete.confirm') }}
              </h3>
            </div>
          </template>

          <p class="text-muted">
            {{ $t('vacancy.delete.description') }}
          </p>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton variant="ghost" @click="isDeleteModalOpen = false">
                {{ $t('common.cancel') }}
              </UButton>
              <UButton color="error" :loading="isDeleting" @click="handleDelete">
                {{ isDeleting ? $t('vacancy.delete.deleting') : $t('vacancy.delete.button') }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
/**
 * Vacancies List Page
 *
 * Displays all vacancies for the current user.
 * Desktop: Pagination with page size selector
 * Mobile: Infinite scroll
 *
 * Related: T101 (US4)
 */

import type { Vacancy } from '@int/schema';
import { useInfiniteScroll, useMediaQuery } from '@vueuse/core';

defineOptions({ name: 'VacancyListPage' });

const toast = useToast();
const { t } = useI18n();

// Use vacancy store
const vacancyStore = useVacancyStore();
const vacancies = computed(() => vacancyStore.vacancies);
const loading = computed(() => vacancyStore.loading);
const error = computed(() => vacancyStore.error);

// Fetch vacancies on page load (SSR-compatible)
await callOnce(async () => {
  await vacancyStore.fetchVacancies();
});

// Responsive detection using VueUse
const isMobile = useMediaQuery('(max-width: 767px)');

// Desktop pagination state
const currentPage = ref(1);
const pageSize = ref(10);
const pageSizeOptions = [10, 25, 50, 100];

// Reset page when page size changes
watch(pageSize, () => {
  currentPage.value = 1;
});

// Mobile infinite scroll state
const mobileItemsLoaded = ref(10);
const loadMoreRef = ref<HTMLElement | null>(null);

const hasMoreItems = computed(() => mobileItemsLoaded.value < vacancies.value.length);

// Total pages for desktop pagination
const totalPages = computed(() => Math.ceil(vacancies.value.length / pageSize.value));

// Infinite scroll for mobile
useInfiniteScroll(
  loadMoreRef,
  () => {
    if (hasMoreItems.value) {
      mobileItemsLoaded.value = Math.min(mobileItemsLoaded.value + 10, vacancies.value.length);
    }
  },
  { distance: 100 }
);

// Computed displayed vacancies based on viewport
const displayedVacancies = computed(() => {
  if (isMobile.value) {
    // Mobile: show items up to mobileItemsLoaded
    return vacancies.value.slice(0, mobileItemsLoaded.value);
  } else {
    // Desktop: show current page
    const start = (currentPage.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return vacancies.value.slice(start, end);
  }
});

// Reset pagination when vacancies change
watch(vacancies, () => {
  currentPage.value = 1;
  mobileItemsLoaded.value = 10;
});

// Delete modal state
const isDeleteModalOpen = ref(false);
const isDeleting = ref(false);
const vacancyToDelete = ref<Vacancy | null>(null);

const viewVacancy = (id: string) => {
  navigateTo(`/vacancies/${id}`);
};

const editVacancy = (id: string) => {
  navigateTo(`/vacancies/${id}?edit=true`);
};

const confirmDelete = (vacancy: Vacancy) => {
  vacancyToDelete.value = vacancy;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!vacancyToDelete.value) return;

  isDeleting.value = true;

  try {
    await vacancyStore.deleteVacancy(vacancyToDelete.value.id);

    toast.add({
      title: t('vacancy.delete.success'),
      color: 'success'
    });

    isDeleteModalOpen.value = false;
    vacancyToDelete.value = null;
  } catch (err) {
    toast.add({
      title: t('vacancy.error.deleteFailed'),
      description: err instanceof Error ? err.message : undefined,
      color: 'error'
    });
  } finally {
    isDeleting.value = false;
  }
};
</script>

<style lang="scss">
.vacancy-list-page {
  // Page-specific styling if needed
}
</style>
