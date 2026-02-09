<template>
  <div
    class="base-page-loading flex items-center justify-center"
    :class="[{ 'flex-col': showText }, wrapperClass]"
  >
    <UIcon name="i-lucide-loader-2" :class="iconClass" />

    <p v-if="showText" class="base-page-loading__text mt-4 text-muted">
      {{ resolvedText }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'BasePageLoading' });

const props = withDefaults(defineProps<Props>(), {
  showText: false,
  wrapperClass: 'py-12',
  text: '',
  iconClass: 'h-8 w-8 animate-spin text-primary'
});

type Props = {
  /**
   * Show loading text under spinner
   */
  showText?: boolean;

  /**
   * Additional wrapper classes (spacing, min-height, etc.)
   */
  wrapperClass?: string;

  /**
   * Custom loading text
   */
  text?: string;

  /**
   * Spinner classes override
   */
  iconClass?: string;
};

const { t } = useI18n();

const resolvedText = computed(() => props.text || t('common.loading'));
</script>
