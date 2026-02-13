# LLM Scenario Settings Recommendations

_Aктуально станом на: 2026-02-13_

## Scope

- This note is internal and based on local experiments on one control case:
  - base resume: Full-Stack Developer profile
  - vacancy: LEGO Group Principal Engineer
- Numbers are relative and should be treated as benchmark baselines, not SLA.

## Recommended setup by scenario

### 1) Resume Parse (`resume_parse`)

- Economy default:
  - Primary: `gemini-2.0-flash`
  - Retry: `gpt-4.1-mini`
- Quality default:
  - Primary: `gpt-4.1-mini`
  - Retry: `gpt-5-mini`

Notes:

- Keep retry enabled for parse stability on edge CV formats.
- Prefer strict JSON response and low temperature.

### 2) Resume Adaptation + Baseline Scoring (`resume_adaptation` + `resume_adaptation_scoring`)

- Economy default:
  - Adaptation: `gpt-4.1-mini`
  - Baseline scoring: `gpt-4.1-mini`
  - Retry: `gpt-4.1-mini`
  - Strategy: `economy`
  - Adaptation reasoning effort: `low` or `auto`
- Quality default:
  - Adaptation: `gpt-5-mini`
  - Baseline scoring: `gpt-5-mini`
  - Retry: `gpt-4.1-mini`
  - Strategy: `quality`
  - Adaptation reasoning effort: `medium` (or `auto` if cost-sensitive)

Notes:

- For caching and lower cost, adaptation and scoring should use the same provider/model when possible.
- Scoring keeps `reasoning_effort: low` (cost control).

### 3) Resume Detailed Scoring (`resume_adaptation_scoring_detail`)

- Use the flow toggle in admin:
  - `OFF` for promo/free roles by default.
  - `ON` for paid/demo/partner roles.
- When enabled:
  - Primary: `gpt-5-mini`
  - Retry: `gpt-4.1-mini`

Notes:

- This call is often more expensive than baseline scoring.
- UI should hide detailed scoring actions when flow is disabled.

### 4) Cover Letter (`cover_letter_generation`)

- Economy default:
  - Primary: `gpt-4.1-mini`
- Quality default:
  - Primary: `gpt-5-mini`

## Strategy mapping

- `economy`: minimal rewrite, lower cost, faster responses.
- `quality`: deeper rewrite quality targets, more expensive.
- Keep strategy independent from model, but recommended pairing:
  - Economy strategy + lower-cost model family.
  - Quality strategy + stronger model family.

## Cost calculation baseline (from experiments)

## Formula

- `flow_cost = adaptation_cost + baseline_scoring_cost (+ detailed_scoring_cost if requested)`
- `model_call_cost ~= input_tokens * input_price + cached_input_tokens * cached_input_price + output_tokens * output_price`
- Prices are per-token normalized from provider per-1M pricing.

## Adaptation + baseline scoring (single generation flow)

| Config               | Models                              | Before/After | Cost (USD) | Notes                                   |
| -------------------- | ----------------------------------- | -----------: | ---------: | --------------------------------------- |
| economy-gemini20     | gemini-2.0-flash / gemini-2.0-flash |        65/90 |   0.000719 | Cheapest, but higher hallucination risk |
| economy-gpt41mini    | gpt-4.1-mini / gpt-4.1-mini         |        55/75 |   0.002524 | Best economy balance                    |
| quality-gpt5mini     | gpt-5-mini / gpt-5-mini             |        28/44 |   0.004613 | Best quality/cost in tested set         |
| quality-gpt5.2       | gpt-5.2 / gpt-5.2                   |        32/38 |   0.014474 | Much higher cost, weak gain             |
| quality-gemini2.5pro | gemini-2.5-pro / gemini-2.5-pro     |        47/50 |   0.012055 | Expensive and less stable in this flow  |

## One-call emulation (adaptation + score in one request)

| Model        | Before/After | Cost (USD) |
| ------------ | -----------: | ---------: |
| gpt-4.1-mini |        55/80 |   0.004297 |
| gpt-5-mini   |        62/80 |   0.006594 |
| gpt-5.2      |        58/72 |   0.037923 |

Additional observation:

- Multi-step reference run (public setup at test time): `0.009466` total.
- One-call can be cheaper, but currently has lower controllability and weaker explainability versus split pipeline.

## Practical defaults for now

- Public/friend roles:
  - Adaptation+baseline: `gpt-4.1-mini`
  - Detailed scoring flow: `OFF`
- Super admin/demo roles:
  - Adaptation+baseline: `gpt-5-mini`
  - Detailed scoring flow: `ON` with `gpt-5-mini`

## Revalidation cadence

- Re-run this benchmark after:
  - provider price updates,
  - strategy prompt changes,
  - scoring schema changes,
  - major model version changes.
