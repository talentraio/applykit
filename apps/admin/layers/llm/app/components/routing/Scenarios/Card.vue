<template>
  <UPageCard variant="ghost" class="llm-routing-card">
    <template #header>
      <div class="flex w-full items-start justify-start gap-3">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-pencil"
          :disabled="editDisabled"
          :aria-label="editAriaLabel"
          @click="emit('edit')"
        />

        <div class="min-w-0 space-y-1 text-left">
          <h3 class="text-sm font-semibold">
            {{ title }}
          </h3>
          <p v-if="description" class="text-xs text-muted">
            {{ description }}
          </p>
        </div>
      </div>
    </template>

    <div class="space-y-3">
      <p class="text-xs font-medium uppercase tracking-wide text-muted">
        {{ capabilitiesLabelValue }}
      </p>

      <slot>
        <ul v-if="capabilities.length > 0" class="list-disc space-y-1 pl-5 text-sm text-toned">
          <li v-for="line in capabilities" :key="line">
            {{ line }}
          </li>
        </ul>

        <p v-else class="text-sm text-muted">
          {{ $t('admin.roles.routing.notConfigured') }}
        </p>
      </slot>
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
type Props = {
  title: string;
  description?: string;
  capabilities?: string[];
  capabilitiesLabel?: string;
  editLabel?: string;
  editDisabled?: boolean;
};

defineOptions({ name: 'LlmRoutingScenariosCard' });

const props = withDefaults(defineProps<Props>(), {
  description: '',
  capabilities: () => [],
  capabilitiesLabel: '',
  editLabel: '',
  editDisabled: false
});

const emit = defineEmits<{
  edit: [];
}>();

const { t } = useI18n();

const capabilitiesLabelValue = computed(() => {
  return props.capabilitiesLabel || t('admin.llm.routing.capabilities');
});

const editAriaLabel = computed(() => {
  return props.editLabel || t('admin.llm.routing.edit');
});
</script>

<style lang="scss">
.llm-routing-card {
  // Reserved for card-level styles.
}
</style>
