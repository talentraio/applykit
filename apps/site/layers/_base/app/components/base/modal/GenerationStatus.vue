<template>
  <ClientOnly>
    <UModal
      :open="props.open"
      :dismissible="false"
      :close="true"
      :title="modalMessages.title"
      :ui="modalUi"
      @update:open="handleUpdateOpen"
    >
      <template #body>
        <div class="base-modal-generation-status__body">
          <p
            class="base-modal-generation-status__description"
            :class="{
              'base-modal-generation-status__description--success': props.state === 'success'
            }"
          >
            {{ modalMessages.description }}
          </p>

          <p class="base-modal-generation-status__message">
            {{ modalMessages.message }}
          </p>

          <UProgress
            v-if="props.state === 'loading'"
            :model-value="progress"
            :max="100"
            size="lg"
            class="base-modal-generation-status__progress"
          />
        </div>
      </template>

      <template #footer>
        <div v-if="showActionButton" class="base-modal-generation-status__footer">
          <UButton block @click="handleActionClick">
            {{ actionButtonLabel }}
          </UButton>
        </div>
      </template>
    </UModal>
  </ClientOnly>
</template>

<script setup lang="ts">
type GenerationStatusModalState = 'loading' | 'success' | 'error';

type GenerationStatusClosePayload =
  | { action: 'acknowledged-success' }
  | { action: 'acknowledged-error' };

defineOptions({ name: 'BaseModalGenerationStatus' });

const props = withDefaults(
  defineProps<{
    open: boolean;
    state: GenerationStatusModalState;
    titleSubject: string;
    readyStatementSubject: string;
    descriptionSubject: string;
    waitingTime: string;
    successDescription?: string;
    errorTitle?: string;
    errorDescription?: string;
    errorMessage?: string;
    errorActionLabel?: string;
  }>(),
  {}
);

const emit = defineEmits<{
  'update:open': [value: boolean];
  close: [payload: GenerationStatusClosePayload];
}>();
const { t } = useI18n();

const FAKE_PROGRESS_INITIAL = 6;
const FAKE_PROGRESS_MAX = 96;
const FAKE_PROGRESS_DELAY_BASE_MS = 170;
const FAKE_PROGRESS_DELAY_GROWTH_MS = 5;
const FAKE_PROGRESS_DELAY_POWER = 1.3;
const modalUi = {
  title: 'base-modal-generation-status__title'
} as const;

const progress = ref(0);
let progressTimeout: ReturnType<typeof setTimeout> | null = null;
let progressTick = 0;

const getFakeProgressDelay = (tick: number): number => {
  return Math.round(
    FAKE_PROGRESS_DELAY_BASE_MS + FAKE_PROGRESS_DELAY_GROWTH_MS * tick ** FAKE_PROGRESS_DELAY_POWER
  );
};

const stopFakeProgress = (): void => {
  if (!progressTimeout) {
    return;
  }

  clearTimeout(progressTimeout);
  progressTimeout = null;
};

const runFakeProgressTick = (): void => {
  if (!props.open || props.state !== 'loading') {
    stopFakeProgress();
    return;
  }

  if (progress.value >= FAKE_PROGRESS_MAX) {
    return;
  }

  progress.value = Math.min(progress.value + 1, FAKE_PROGRESS_MAX);
  progressTick += 1;
  progressTimeout = setTimeout(runFakeProgressTick, getFakeProgressDelay(progressTick));
};

const startFakeProgress = (): void => {
  stopFakeProgress();
  progress.value = FAKE_PROGRESS_INITIAL;
  progressTick = 0;
  progressTimeout = setTimeout(runFakeProgressTick, getFakeProgressDelay(progressTick));
};

watch(
  () => [props.open, props.state] as const,
  ([open, state]) => {
    if (!open) {
      stopFakeProgress();
      progress.value = 0;
      return;
    }

    if (state === 'loading') {
      startFakeProgress();
      return;
    }

    stopFakeProgress();

    if (state === 'success') {
      progress.value = 100;
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  stopFakeProgress();
});

const modalMessages = computed(() => {
  switch (props.state) {
    case 'success':
      return {
        title: t('generation.statusModal.title.success', { subject: props.titleSubject }),
        description: props.successDescription ?? t('generation.statusModal.description.success'),
        message: t('generation.statusModal.message.success', {
          subject: props.readyStatementSubject
        })
      };

    case 'error':
      return {
        title: props.errorTitle ?? t('generation.statusModal.title.error'),
        description: props.errorDescription ?? t('generation.statusModal.description.error'),
        message: props.errorMessage ?? t('generation.statusModal.message.error')
      };

    case 'loading':
    default:
      return {
        title: t('generation.statusModal.title.loading', { subject: props.titleSubject }),
        description: t('generation.statusModal.description.loading', {
          subject: props.descriptionSubject
        }),
        message: t('generation.statusModal.message.loading', {
          waitingTime: props.waitingTime
        })
      };
  }
});

const showActionButton = computed(() => props.state !== 'loading');

const actionButtonLabel = computed(() => {
  if (props.state === 'success') {
    return t('generation.statusModal.action.success', {
      subject: props.readyStatementSubject
    });
  }

  return props.errorActionLabel ?? t('generation.statusModal.action.error');
});

const handleUpdateOpen = (value: boolean): void => {
  emit('update:open', value);
};

const handleActionClick = (): void => {
  if (props.state === 'success') {
    emit('close', { action: 'acknowledged-success' });
    return;
  }

  emit('close', { action: 'acknowledged-error' });
};
</script>

<style lang="scss">
.base-modal-generation-status {
  &__title {
    text-transform: capitalize;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__description {
    margin: 32px 0;
    color: var(--ui-text-highlighted);
    font-size: 28px;
    font-weight: 600;
    line-height: 1.6;
    text-align: center;

    &--success {
      text-align: center;
      font-size: 1.125rem;
      line-height: 1.4;
      color: var(--ui-success);
      border-radius: 0.75rem;
      padding: 0.875rem 1rem;
      background-color: color-mix(in srgb, var(--ui-success) 16%, transparent);
      border: 1px solid color-mix(in srgb, var(--ui-success) 32%, transparent);
    }
  }

  &__message {
    margin: 0;
    color: var(--ui-text-toned);
    line-height: 1.5;
  }

  &__progress {
    width: 100%;
  }

  &__footer {
    width: 100%;
  }
}
</style>
