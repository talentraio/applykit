<template>
  <div class="cover-letter-pdf-preview" :data-cover-letter-pdf-ready="isReady ? 'true' : 'false'">
    <div v-if="pending" class="cover-letter-pdf-preview__status">Preparing preview...</div>
    <div v-else-if="!payload" class="cover-letter-pdf-preview__status">Preview unavailable.</div>
    <div v-else class="cover-letter-pdf-preview__content">
      <VacancyCoverPaperPreview
        class="cover-letter-pdf-preview__page"
        :html-content="previewHtml"
        :subject-line="payload.subjectLine"
        :settings="previewSettings"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SpacingSettings } from '@int/schema';
import { DefaultCoverLetterFormatSettings, SpacingSettingsSchema } from '@int/schema';
import { coverLetterApi } from '@site/vacancy/app/infrastructure/cover-letter.api';
import { markdownToHtml } from '@site/vacancy/app/utils/cover-letter-markdown';

defineOptions({ name: 'CoverLetterPdfPreviewPage' });

definePageMeta({
  layout: false
});

const route = useRoute();

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''));

const previewDataKey = computed(() => `cover-letter-pdf-preview:${token.value}`);

const { data, pending, refresh } = await useAsyncData(
  previewDataKey,
  async () => {
    if (!token.value) return null;

    return await coverLetterApi.fetchPdfPayload(token.value);
  },
  {
    watch: [token],
    getCachedData: () => undefined
  }
);

onMounted(() => {
  if (!token.value) return;
  void refresh();
});

const payload = computed(() => data.value);

const previewSettings = computed<SpacingSettings>(() => {
  const merged = {
    ...DefaultCoverLetterFormatSettings,
    ...(payload.value?.settings ?? {})
  };

  const parsed = SpacingSettingsSchema.safeParse(merged);
  if (!parsed.success) {
    return DefaultCoverLetterFormatSettings;
  }

  return parsed.data;
});

const previewHtml = computed(() => markdownToHtml(payload.value?.contentMarkdown ?? ''));

const isReady = computed(() => Boolean(payload.value?.contentMarkdown) && !pending.value);

useHead(() => ({
  title: payload.value?.subjectLine
    ? `${payload.value.subjectLine} - Cover Letter`
    : 'Cover Letter Preview'
}));
</script>

<style lang="scss">
@page {
  size: a4;
  margin: 0;
}

html,
body {
  margin: 0;
  padding: 0;
  background: white;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

#nuxt-devtools,
#nuxt-devtools-container,
#nuxt-devtools-badge,
[id='__nuxt_devtools__'],
.nuxt-devtools,
.nuxt-devtools-badge {
  display: none !important;
}

.cover-letter-pdf-preview {
  min-height: 100vh;
  background: white;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0;

  &__status {
    padding: 2rem;
    color: var(--color-neutral-600);
    font-size: 0.95rem;
  }

  &__content {
    width: 210mm;
  }

  .cover-letter-paper-preview {
    &__sheet {
      box-shadow: none;
      border: none;
    }
  }
}
</style>
