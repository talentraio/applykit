<template>
  <UPageCard class="llm-routing-scenarios">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold">
          {{ title }}
        </h2>
        <p class="text-sm text-muted">
          {{ description }}
        </p>
      </div>
    </template>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
    </div>

    <div
      v-else-if="showEmptyState"
      class="rounded-lg border border-dashed border-muted p-4 text-sm text-muted"
    >
      {{ emptyLabel }}
    </div>

    <UPageList v-else divide>
      <LlmRoutingScenariosCard
        v-if="resumeParseCard"
        :title="$t('admin.llm.routing.scenarios.resume_parse')"
        :description="
          resumeParseCard.description ?? $t('admin.llm.routing.scenarioDescriptions.resume_parse')
        "
        :capabilities="resumeParseCard.capabilities ?? []"
        :edit-disabled="resumeParseCard.editDisabled ?? false"
        :edit-label="editLabel"
        @edit="emit('edit', LLM_SCENARIO_KEY_MAP.RESUME_PARSE)"
      />

      <LlmRoutingScenariosCard
        v-if="resumeAdaptationCard"
        :title="$t('admin.llm.routing.scenarios.resume_adaptation_with_scoring')"
        :description="
          resumeAdaptationCard.description ??
          $t('admin.llm.routing.scenarioDescriptions.resume_adaptation_with_scoring')
        "
        :capabilities="resumeAdaptationCard.capabilities ?? []"
        :edit-disabled="resumeAdaptationCard.editDisabled ?? false"
        :edit-label="editLabel"
        @edit="emit('edit', LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION)"
      />

      <LlmRoutingScenariosCard
        v-if="detailedScoringCard"
        :title="$t('admin.llm.routing.scenarios.resume_adaptation_scoring_detail')"
        :description="
          detailedScoringCard.description ??
          $t('admin.llm.routing.scenarioDescriptions.resume_adaptation_scoring_detail')
        "
        :capabilities="detailedScoringCard.capabilities ?? []"
        :edit-disabled="detailedScoringCard.editDisabled ?? false"
        :edit-label="editLabel"
        @edit="emit('edit', LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL)"
      />

      <LlmRoutingScenariosCard
        v-if="coverLetterCard"
        :title="$t('admin.llm.routing.scenarios.cover_letter_generation')"
        :description="
          coverLetterCard.description ??
          $t('admin.llm.routing.scenarioDescriptions.cover_letter_generation')
        "
        :capabilities="coverLetterCard.capabilities ?? []"
        :edit-disabled="coverLetterCard.editDisabled ?? false"
        :edit-label="editLabel"
        @edit="emit('edit', LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION)"
      />
    </UPageList>
  </UPageCard>
</template>

<script setup lang="ts">
import type { EditableScenarioKey, RoutingScenarioCardsConfig } from './types';
import { LLM_SCENARIO_KEY_MAP } from '@int/schema';
import LlmRoutingScenariosCard from './Card.vue';

type Props = {
  title: string;
  description: string;
  loading?: boolean;
  isEmpty?: boolean;
  emptyLabel?: string;
  editLabel?: string;
  scenarioCards?: RoutingScenarioCardsConfig;
};

defineOptions({ name: 'LlmRoutingScenarios' });

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  isEmpty: false,
  emptyLabel: '',
  editLabel: '',
  scenarioCards: () => ({})
});

const emit = defineEmits<{
  edit: [scenarioKey: EditableScenarioKey];
}>();

const resumeParseCard = computed(() => {
  return props.scenarioCards[LLM_SCENARIO_KEY_MAP.RESUME_PARSE];
});

const resumeAdaptationCard = computed(() => {
  return props.scenarioCards[LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION];
});

const coverLetterCard = computed(() => {
  return props.scenarioCards[LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION];
});

const detailedScoringCard = computed(() => {
  return props.scenarioCards[LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL];
});

const hasScenarioCards = computed(() => {
  return Boolean(
    resumeParseCard.value ||
    resumeAdaptationCard.value ||
    coverLetterCard.value ||
    detailedScoringCard.value
  );
});

const showEmptyState = computed(() => {
  return props.isEmpty || !hasScenarioCards.value;
});
</script>

<style lang="scss">
.llm-routing-scenarios {
  // Reserved for list-level styles.
}
</style>
