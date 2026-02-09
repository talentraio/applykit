<template>
  <div
    class="vacancy-list-content-mobile-card relative overflow-hidden rounded-lg border border-default"
  >
    <div class="absolute inset-y-0 left-0 flex w-[72px] items-center justify-center bg-default/50">
      <UCheckbox :model-value="selected" @update:model-value="handleCheckboxUpdate" />
    </div>

    <div class="absolute inset-y-0 right-0 flex w-[72px] items-center justify-center bg-error/15">
      <UButton
        icon="i-lucide-trash-2"
        color="error"
        variant="ghost"
        size="sm"
        :aria-label="$t('vacancy.delete.button')"
        @click.stop="handleDeleteClick"
      />
    </div>

    <button
      ref="cardRef"
      type="button"
      class="vacancy-list-content-mobile-card__surface relative z-10 grid min-h-16 w-full grid-cols-[1.6fr_auto_auto] items-center gap-3 bg-default px-3 py-2 text-left"
      :style="cardTransformStyle"
      @click="handleCardClick"
    >
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold">
          {{ vacancy.company }}
        </p>
        <p class="truncate text-xs text-muted">
          {{ vacancy.jobPosition || $t('vacancy.list.noPosition') }}
        </p>
      </div>

      <div class="justify-self-center">
        <UBadge class="capitalize" variant="subtle" :color="getStatusColor(vacancy.status)">
          {{ $t(`vacancy.status.${vacancy.status}`) }}
        </UBadge>
      </div>

      <div class="justify-self-end text-right text-[11px] leading-tight text-muted">
        <p>{{ $t('vacancy.list.columns.updatedAt') }}: {{ formatDate(vacancy.updatedAt) }}</p>
        <p>{{ $t('vacancy.list.columns.createdAt') }}: {{ formatDate(vacancy.createdAt) }}</p>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Vacancy } from '@int/schema';
import { format } from 'date-fns';
import { getStatusColor } from '../../../../utils/statusColors';

type Props = {
  vacancy: Vacancy;
  selected: boolean;
};

type Emits = {
  open: [vacancy: Vacancy];
  delete: [vacancy: Vacancy];
  select: [payload: { id: string; selected: boolean }];
};

defineOptions({ name: 'VacancyListContentTableMobileCard' });
const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const REVEAL_OFFSET = 72;
const SNAP_THRESHOLD = 36;
const HAPTIC_PATTERN = [18];

const cardRef = ref<HTMLElement | null>(null);
const deleteRevealed = ref(false);
const isDragging = ref(false);
const hasSwipedInGesture = ref(false);

const dragOffset = ref(0);
const startX = ref(0);
const startY = ref(0);
const deltaX = ref(0);
const deltaY = ref(0);
const baseOffset = ref(0);

const { vibrate, isSupported } = useVibrate({ pattern: HAPTIC_PATTERN });

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const triggerHaptic = () => {
  if (isSupported.value) {
    vibrate();
  }
};

const emitSelection = (selected: boolean) => {
  if (props.selected !== selected) {
    emit('select', { id: props.vacancy.id, selected });
  }
};

const toNeutral = () => {
  const hadShift = deleteRevealed.value || props.selected;
  deleteRevealed.value = false;
  emitSelection(false);

  if (hadShift) {
    triggerHaptic();
  }
};

const toSelectRevealed = () => {
  const wasSelected = props.selected;
  const wasDeleteRevealed = deleteRevealed.value;
  deleteRevealed.value = false;
  emitSelection(true);

  if (!wasSelected || wasDeleteRevealed) {
    triggerHaptic();
  }
};

const toDeleteRevealed = () => {
  const wasDeleteRevealed = deleteRevealed.value;
  const wasSelected = props.selected;
  deleteRevealed.value = true;
  emitSelection(false);

  if (!wasDeleteRevealed || wasSelected) {
    triggerHaptic();
  }
};

const surfaceOffset = computed(() => {
  if (isDragging.value) {
    return dragOffset.value;
  }

  if (deleteRevealed.value) {
    return -REVEAL_OFFSET;
  }

  if (props.selected) {
    return REVEAL_OFFSET;
  }

  return 0;
});

const cardTransformStyle = computed(() => ({
  transform: `translateX(${surfaceOffset.value}px)`,
  transition: isDragging.value ? 'none' : 'transform 180ms ease-out'
}));

const handleCheckboxUpdate = (value: boolean | 'indeterminate') => {
  if (value === true) {
    toSelectRevealed();
  } else {
    toNeutral();
  }
};

const handleDeleteClick = () => {
  emit('delete', props.vacancy);
};

const handleCardClick = () => {
  if (hasSwipedInGesture.value) {
    hasSwipedInGesture.value = false;
    return;
  }

  if (deleteRevealed.value || props.selected) {
    toNeutral();
    return;
  }

  emit('open', props.vacancy);
};

const finalizeSwipe = () => {
  const finalOffset = clamp(baseOffset.value + deltaX.value, -REVEAL_OFFSET, REVEAL_OFFSET);

  if (finalOffset >= SNAP_THRESHOLD) {
    toSelectRevealed();
    return;
  }

  if (finalOffset <= -SNAP_THRESHOLD) {
    toDeleteRevealed();
    return;
  }

  toNeutral();
};

useSwipe(cardRef, {
  passive: false,
  threshold: 8,
  onSwipeStart(event) {
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    if (!touch) return;
    startX.value = touch.clientX;
    startY.value = touch.clientY;
    deltaX.value = 0;
    deltaY.value = 0;
    hasSwipedInGesture.value = false;
    baseOffset.value = deleteRevealed.value ? -REVEAL_OFFSET : props.selected ? REVEAL_OFFSET : 0;
    dragOffset.value = baseOffset.value;
    isDragging.value = true;
  },
  onSwipe(event) {
    if (!isDragging.value || event.touches.length !== 1) return;

    const touch = event.touches[0];
    if (!touch) return;
    deltaX.value = touch.clientX - startX.value;
    deltaY.value = touch.clientY - startY.value;

    if (Math.abs(deltaX.value) <= Math.abs(deltaY.value)) {
      return;
    }

    event.preventDefault();
    dragOffset.value = clamp(baseOffset.value + deltaX.value, -REVEAL_OFFSET, REVEAL_OFFSET);

    if (Math.abs(deltaX.value) > 10) {
      hasSwipedInGesture.value = true;
    }
  },
  onSwipeEnd() {
    if (!isDragging.value) return;

    isDragging.value = false;
    finalizeSwipe();
  }
});

const formatDate = (value: Date | string) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return format(date, 'dd.MM.yyyy');
};
</script>

<style lang="scss">
.vacancy-list-content-mobile-card {
  &__surface {
    touch-action: pan-y;
  }
}
</style>
