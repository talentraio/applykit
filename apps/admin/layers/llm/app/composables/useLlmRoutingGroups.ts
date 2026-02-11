import type { LlmRoutingItem, LlmScenarioKey } from '@int/schema';
import { LLM_SCENARIO_KEY_MAP } from '@int/schema';

export type LlmRoutingGroup = {
  key: LlmScenarioKey;
  primary: LlmRoutingItem;
  secondary: LlmRoutingItem | null;
  isResumeParse: boolean;
};

export function buildLlmRoutingGroups(items: LlmRoutingItem[]): LlmRoutingGroup[] {
  const scoringKey = LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING;
  const adaptationKey = LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION;

  const byKey = new Map(items.map(item => [item.scenarioKey, item]));
  const scoringItem = byKey.get(scoringKey) ?? null;
  const adaptationExists = byKey.has(adaptationKey);

  const groups: LlmRoutingGroup[] = [];

  items.forEach(item => {
    if (item.scenarioKey === scoringKey) {
      if (!adaptationExists) {
        groups.push({
          key: item.scenarioKey,
          primary: item,
          secondary: null,
          isResumeParse: false
        });
      }
      return;
    }

    if (item.scenarioKey === adaptationKey && scoringItem) {
      groups.push({
        key: item.scenarioKey,
        primary: item,
        secondary: scoringItem,
        isResumeParse: false
      });
      return;
    }

    groups.push({
      key: item.scenarioKey,
      primary: item,
      secondary: null,
      isResumeParse: item.scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_PARSE
    });
  });

  return groups;
}
