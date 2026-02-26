<template>
  <div class="resume-preview" :data-ready="isReady ? 'true' : 'false'">
    <template v-if="hasBlocks || props.loading">
      <BasePaginatedSheets
        class="resume-preview__pages"
        :blocks="blocks"
        :margin-x-mm="settings.marginX"
        :margin-y-mm="settings.marginY"
        :font-size="settings.fontSize"
        :line-height="settings.lineHeight"
        :block-spacing-px="settings.blockSpacing * 2"
        :loading="props.loading"
        :show-loading-when-measuring="true"
        @ready-change="handlePaginatedReadyChange"
      >
        <template #content="{ blocks: pageBlocks }">
          <div class="resume-preview__page-content" :style="contentVariablesStyle">
            <template v-for="block in pageBlocks" :key="block.id">
              <div class="resume-preview__block" :data-block-id="block.id">
                <BlockRenderer :block="block" :type="props.type" :photo-url="photoUrl" />
              </div>
            </template>
          </div>
        </template>
      </BasePaginatedSheets>
    </template>

    <!-- Empty state -->
    <div v-else class="resume-preview__empty">
      <UIcon name="i-lucide-file-text" class="h-12 w-12 text-muted" />
      <p class="mt-4 text-sm text-muted">{{ $t('resume.preview.empty') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Preview Component
 *
 * FlowCV-style A4 preview with zoom scaling and block-based pagination.
 *
 * Features:
 * - Fixed A4 pages with zoom-based scaling (no content reflow)
 * - Deterministic pagination based on measured block heights
 * - Keep-with-next rules for section headings
 * - Multi-page support with smooth scrolling
 *
 * Related: T025 (US2)
 */

import type {
  ResumeContent,
  ResumeFormatSettingsAts,
  ResumeFormatSettingsHuman,
  SpacingSettings
} from '@int/schema';
import type { PreviewType } from '../../types/preview';
import { EXPORT_FORMAT_MAP } from '@int/schema';
import BlockRenderer from './BlockRenderer.vue';

defineOptions({ name: 'ResumePreview' });

const props = withDefaults(
  defineProps<{
    /**
     * Resume content to display
     */
    content: ResumeContent;
    /**
     * Preview type: ATS or Human
     * @default EXPORT_FORMAT_MAP.ATS
     */
    type?: PreviewType;
    /**
     * Format settings (spacing + localization per format type)
     */
    settings?: ResumeFormatSettingsAts | ResumeFormatSettingsHuman;
    /**
     * Profile photo URL for human view
     */
    photoUrl?: string;
    /**
     * Show loading state instead of rendered pages
     */
    loading?: boolean;
  }>(),
  {
    type: EXPORT_FORMAT_MAP.ATS,
    settings: undefined,
    loading: false
  }
);

const defaults = useFormatSettingsDefaults();
const defaultSpacing = computed<SpacingSettings>(() =>
  props.type === EXPORT_FORMAT_MAP.HUMAN ? defaults.human.spacing : defaults.ats.spacing
);

// Extract spacing from format settings, with defaults
const settings = computed<SpacingSettings>(() => ({
  ...defaultSpacing.value,
  ...props.settings?.spacing
}));

// Convert content to blocks
const contentRef = computed(() => props.content);
const { blocks } = useResumeBlocks(contentRef);
const hasBlocks = computed(() => blocks.value.length > 0);
const paginatedReady = ref(false);
const isReady = computed(() => hasBlocks.value && paginatedReady.value);

const contentVariablesStyle = computed(() => ({
  '--line-height': settings.value.lineHeight,
  '--block-spacing': `${settings.value.blockSpacing * 2}px`
}));

const handlePaginatedReadyChange = (ready: boolean): void => {
  paginatedReady.value = ready;
};
</script>

<style lang="scss">
.resume-preview {
  width: 100%;
  position: relative;

  &__page-content {
    background: white;
    color: #1f2937;
    font-family: Manrope, 'Segoe UI', sans-serif;
    box-sizing: border-box;
    height: 100%; // Fill the A4 page so bottom padding aligns to page bottom

    .text-2xl {
      font-size: 1.5em !important;
      line-height: inherit !important;
    }

    .text-xl {
      font-size: 1.25em !important;
      line-height: inherit !important;
    }

    .text-lg {
      font-size: 1.125em !important;
      line-height: inherit !important;
    }

    .text-base {
      font-size: 1em !important;
      line-height: inherit !important;
    }

    .text-sm {
      font-size: 0.875em !important;
      line-height: inherit !important;
    }

    .text-xs {
      font-size: 0.75em !important;
      line-height: inherit !important;
    }

    // Scale leading classes relative to base line height
    .leading-relaxed {
      line-height: calc(var(--line-height, 1.2) * 1.3) !important;
    }

    .leading-normal {
      line-height: var(--line-height, 1.2) !important;
    }

    .leading-tight {
      line-height: calc(var(--line-height, 1.2) * 0.9) !important;
    }

    .text-muted {
      color: #6b7280 !important;
    }

    .text-primary {
      color: #2563eb !important;
    }

    a {
      color: #2563eb !important;
    }
  }

  &__block {
    // Prevent child margin-collapsing so measured block heights match rendered layout.
    display: flow-root;

    // Block spacing using CSS variable
    &:not(:first-child) {
      margin-top: var(--block-spacing, 10px);
    }
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    text-align: center;
  }
}
</style>
