# Data Model: 009 - Cached Two-Step Resume Adaptation Scoring

## Modified enums

### LlmScenarioKey

Add new scenario key for independent scoring configuration.

| Value                       | Purpose                              |
| --------------------------- | ------------------------------------ |
| `resume_parse`              | Resume parsing                       |
| `resume_adaptation`         | Tailored resume content generation   |
| `resume_adaptation_scoring` | Score calculation for adapted resume |
| `cover_letter_generation`   | Cover letter generation              |

### UsageContext

Add scoring-specific usage context.

| Value                       | Purpose                            |
| --------------------------- | ---------------------------------- |
| `resume_base`               | Resume parse/upload workflows      |
| `resume_adaptation`         | Adaptation content generation call |
| `resume_adaptation_scoring` | Scoring call                       |
| `export`                    | Export workflows                   |

### ProviderType

Remove BYOK from active runtime enum.

| Value      | Purpose                       |
| ---------- | ----------------------------- |
| `platform` | Platform-managed provider use |

## Modified entities

### LlmScenario (existing)

Existing table keeps scenario catalog metadata. Add seeded row:

- `key = resume_adaptation_scoring`
- `label = Resume Adaptation Scoring`
- `description = Score generated tailored resume against vacancy`
- `enabled = true`

No new columns required.

### LlmScenarioModel / LlmRoleScenarioOverride (existing)

No structural changes required. They now accept assignments for `resume_adaptation_scoring` key.

### UsageLog (existing)

No table column additions.

Data behavior changes:

- New writes include context `resume_adaptation_scoring` for scoring call.
- Legacy rows with `provider_type = byok` are normalized to `platform` during migration.

### Generation (existing)

`match_score_before` and `match_score_after` remain required integers.

No structural change in this phase.

## New runtime DTOs (service-level)

### AdaptationPhaseResult

| Field      | Type          | Description                     |
| ---------- | ------------- | ------------------------------- |
| content    | ResumeContent | Tailored resume content         |
| provider   | LLMProvider   | Resolved provider               |
| tokensUsed | number        | Token usage for adaptation call |
| cost       | number        | Cost for adaptation call        |

### ScoringPhaseResult

| Field            | Type        | Description                          |
| ---------------- | ----------- | ------------------------------------ |
| matchScoreBefore | number      | Base resume score                    |
| matchScoreAfter  | number      | Adapted resume score                 |
| provider         | LLMProvider | Resolved provider                    |
| tokensUsed       | number      | Token usage for scoring call         |
| cost             | number      | Cost for scoring call                |
| usedFallback     | boolean     | Indicates deterministic fallback use |

## Deterministic fallback scoring model

When LLM scoring fails:

1. Build normalized keyword set from vacancy description (filtered and deduplicated).
2. Compute overlap ratio against base resume text and adapted resume text.
3. Convert ratios to bounded integer scores (0..100).
4. Enforce invariant `matchScoreAfter >= matchScoreBefore` by clamping after-score if needed.

This fallback is deterministic and free (no extra LLM call).

## Relationships

```text
llm_scenarios (1) ----- (1) llm_scenario_models ----- (n) llm_models
      |
      +----- (n) llm_role_scenario_overrides ----- (n) llm_models

usage_logs stores:
  - provider_type = platform
  - usage_context in {resume_base, resume_adaptation, resume_adaptation_scoring, export}
```

## Validation rules

1. Scoring output must satisfy:
   - `matchScoreBefore` in `0..100`
   - `matchScoreAfter` in `0..100`
   - `matchScoreAfter >= matchScoreBefore`
2. Scoring scenario routing must reference active model records.
3. If scoring scenario config is missing, runtime fallback model from config is used.
4. Fallback scoring path must also satisfy score bounds/invariant.

## State transitions

Vacancy generation availability behavior remains unchanged:

- Initial vacancy: `canGenerateResume = true`
- After successful generation save: `canGenerateResume = false`
- Unlock conditions continue to be driven by vacancy edit rules.

## Migration notes

1. Add `resume_adaptation_scoring` to scenario key enum and seed catalog row.
2. Add `resume_adaptation_scoring` to usage context enum.
3. Normalize existing `usage_logs.provider_type = byok` rows to `platform`.
4. Replace DB enum `provider_type` with platform-only valueset.
5. Update app/schema constants to remove BYOK from runtime type space.
