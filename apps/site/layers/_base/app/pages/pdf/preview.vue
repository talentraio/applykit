<template>
  <div class="pdf-preview" :data-pdf-ready="isReady ? 'true' : 'false'">
    <div v-if="pending" class="pdf-preview__status">Preparing preview...</div>
    <div v-else-if="!payload" class="pdf-preview__status">Preview unavailable.</div>
    <div v-else class="pdf-preview__content">
      <ResumePreview
        :content="payload.content"
        :type="previewType"
        :settings="payload.settings"
        :photo-url="payload.photoUrl"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ExportFormat, ResumeContent, ResumeFormatSettings } from '@int/schema';

defineOptions({ name: 'PdfPreviewPage' });

definePageMeta({
  layout: false
});

type PdfPayload = {
  format: ExportFormat;
  content: ResumeContent;
  settings?: Partial<ResumeFormatSettings>;
  photoUrl?: string;
  filename?: string;
};

const route = useRoute();
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''));

const { data, pending } = await useAsyncData<PdfPayload | true>('pdf-preview', async () => {
  if (!token.value) return true;

  return await useApi('/api/pdf/payload', {
    query: { token: token.value }
  });
});

const payload = computed(() => {
  return data.value !== true ? data.value : null;
});

const previewType = computed(() => (payload.value?.format === 'human' ? 'human' : 'ats'));
const isReady = computed(() => Boolean(payload.value?.content) && !pending.value);

useHead(() => ({
  title: payload.value?.content?.personalInfo?.fullName
    ? `${payload.value.content.personalInfo.fullName} - Resume`
    : 'Resume Preview'
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
}

#nuxt-devtools,
#nuxt-devtools-container,
#nuxt-devtools-badge,
[id='__nuxt_devtools__'],
.nuxt-devtools,
.nuxt-devtools-badge {
  display: none !important;
}

.pdf-preview {
  min-height: 100vh;
  background: white;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 0;

  &__status {
    padding: 2rem;
    color: var(--color-neutral-600);
    font-size: 0.95rem;
  }

  &__content {
    width: 210mm;
  }

  .resume-preview {
    &__pages {
      gap: 0;
    }

    &__page {
      box-shadow: none;
      border: none;
    }

    &__page-number {
      display: none;
    }
  }
}
</style>
