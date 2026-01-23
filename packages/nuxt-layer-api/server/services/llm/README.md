# LLM Service

Multi-provider LLM service with support for OpenAI and Google Gemini.

## Overview

The LLM service provides a unified interface for calling different LLM providers with automatic provider selection, cost tracking, and BYOK (Bring Your Own Key) support.

**Supported Providers:**

- OpenAI (GPT-4o, GPT-4-turbo, GPT-3.5-turbo)
- Google Gemini (Gemini 2.0 Flash, Gemini 1.5 Pro/Flash)

## Architecture

```
server/services/llm/
├── types.ts              # Interfaces and error types
├── providers/
│   ├── openai.ts         # OpenAI provider implementation
│   └── gemini.ts         # Gemini provider implementation
└── index.ts              # Service factory and provider selection
```

## Usage

### Basic LLM Call

```typescript
import { callLLM } from '~/server/services/llm'

export default defineEventHandler(async event => {
  const response = await callLLM({
    prompt: 'Explain quantum computing in simple terms',
    systemMessage: 'You are a helpful teacher',
    temperature: 0.7,
    maxTokens: 500
  })

  console.log(response.content)
  console.log(`Tokens used: ${response.tokensUsed}`)
  console.log(`Cost: $${response.cost.toFixed(4)}`)

  return { content: response.content }
})
```

### BYOK (Bring Your Own Key)

```typescript
import { callLLM } from '~/server/services/llm'

export default defineEventHandler(async event => {
  // User provides their own API key (from request header)
  const userApiKey = getHeader(event, 'x-api-key')

  if (!userApiKey) {
    throw createError({ statusCode: 400, message: 'API key required' })
  }

  const response = await callLLM(
    {
      prompt: 'Summarize this resume...',
      maxTokens: 1000
    },
    {
      userApiKey,
      provider: 'openai' // or 'gemini'
    }
  )

  return response
})
```

### Platform LLM

```typescript
// Uses platform API key from environment
// Automatically checks budget and increments usage
const response = await callLLM({
  prompt: 'Generate resume summary...'
})

// Platform budget is tracked in system_configs table
```

### Validate API Key

```typescript
import { validateKey } from '~/server/services/llm'

export default defineEventHandler(async event => {
  const { provider, apiKey } = await readBody(event)

  const isValid = await validateKey(provider, apiKey)

  if (isValid) {
    // Store key metadata (hint only) in database
    await llmKeyRepository.upsert(user.id, provider, getKeyHint(apiKey))
    return { success: true }
  }

  throw createError({ statusCode: 401, message: 'Invalid API key' })
})
```

## Provider Selection Logic

The service automatically selects the appropriate provider and key:

1. **BYOK Mode**: If user provides `userApiKey`, use that
2. **Platform Mode**: Use platform key from environment
3. **Budget Check**: Verify platform budget before using platform key
4. **Provider Preference**: Use system configuration or user preference

```typescript
// Priority order:
// 1. User API key (BYOK) + specified provider
// 2. User API key (BYOK) + default provider (OpenAI)
// 3. Platform key + system configured provider
// 4. Platform key + default provider (OpenAI)
```

## Configuration

### Environment Variables

```bash
# OpenAI
OPENAI_API_KEY=sk-proj-...

# Google Gemini
GEMINI_API_KEY=AIza...

# Platform settings (in database - system_configs table)
# - platform_llm_enabled: true/false
# - platform_provider: 'openai' | 'gemini'
# - global_budget_cap: 100.00 (USD)
# - global_budget_used: 45.23 (USD)
```

### System Configuration

```typescript
import { systemConfigRepository } from '~/server/data/repositories'

// Enable platform LLM
await systemConfigRepository.setBoolean('platform_llm_enabled', true)

// Set platform provider
await systemConfigRepository.setPlatformProvider('openai')

// Set budget cap
await systemConfigRepository.setNumber('global_budget_cap', 100.0)

// Check if platform LLM can be used
const { allowed, reason } = await systemConfigRepository.canUsePlatformLLM()
```

## Models and Pricing

### OpenAI

| Model         | Input (per 1M tokens) | Output (per 1M tokens) | Best For              |
| ------------- | --------------------- | ---------------------- | --------------------- |
| gpt-4o        | $5.00                 | $15.00                 | Complex tasks         |
| gpt-4o-mini   | $0.15                 | $0.60                  | Fast, cheap (default) |
| gpt-4-turbo   | $10.00                | $30.00                 | High quality          |
| gpt-3.5-turbo | $0.50                 | $1.50                  | Simple tasks          |

### Google Gemini

| Model            | Input (per 1M tokens) | Output (per 1M tokens) | Best For              |
| ---------------- | --------------------- | ---------------------- | --------------------- |
| gemini-2.0-flash | $0.10                 | $0.40                  | Fast, cheap (default) |
| gemini-1.5-flash | $0.075                | $0.30                  | Very cheap            |
| gemini-1.5-pro   | $1.25                 | $5.00                  | Complex tasks         |

## Error Handling

### Error Types

```typescript
import { LLMAuthError, LLMError, LLMQuotaError, LLMRateLimitError } from '~/server/services/llm'

try {
  const response = await callLLM({ prompt: '...' })
} catch (error) {
  if (error instanceof LLMAuthError) {
    // Invalid API key
    return { error: 'Invalid API key' }
  } else if (error instanceof LLMRateLimitError) {
    // Rate limit exceeded
    return { error: 'Rate limit exceeded, try again later' }
  } else if (error instanceof LLMQuotaError) {
    // Quota exceeded
    return { error: 'Quota exceeded' }
  } else if (error instanceof LLMError) {
    // Generic LLM error
    return { error: error.message }
  }
}
```

### Status Codes

- **401**: Authentication error (invalid API key)
- **429**: Rate limit exceeded
- **403**: Quota exceeded
- **500**: Other API errors

## Security

### BYOK Key Handling

**CRITICAL SECURITY REQUIREMENTS:**

1. ✅ **Never store full keys in database** - Only store last 4 characters as hint
2. ✅ **Never log full keys** - Use `sanitizeApiKey()` for logging
3. ✅ **Store keys in browser only** - Full keys live in localStorage
4. ✅ **Transmit over HTTPS only** - Use secure connections
5. ✅ **Validate before use** - Call `validateKey()` before storing

```typescript
// ❌ WRONG: Never do this
console.log('User API key:', userApiKey)
await db.insert({ apiKey: userApiKey })

// ✅ CORRECT: Always sanitize
console.log('User API key:', sanitizeApiKey(userApiKey))
await db.insert({ keyHint: getKeyHint(userApiKey) })
```

### Key Storage

```typescript
import { getKeyHint, sanitizeApiKey } from '~/server/services/llm'

// Store only hint in database
const hint = getKeyHint('sk-proj-1234567890abcdefghijklmnopqrstuvwxyz')
// → 'wxyz'

await llmKeyRepository.upsert(userId, 'openai', hint)

// Sanitize for logging
const safe = sanitizeApiKey('sk-proj-1234567890abcdefghijklmnopqrstuvwxyz')
// → '****wxyz'

console.log(`Stored key: ${safe}`)
```

## Usage Tracking

All LLM calls are automatically logged to `usage_logs` table:

```typescript
import { logUsage } from '~/server/utils/usage'

// After LLM call
await logUsage(
  userId,
  'generate', // operation
  response.providerType, // 'platform' or 'byok'
  response.tokensUsed,
  response.cost
)
```

## Integration Examples

### Parse Resume

```typescript
// server/api/resumes/parse.post.ts
export default defineEventHandler(async event => {
  const user = event.context.user
  const { resumeText } = await readBody(event)

  // Check limit
  await requireLimit(user.id, 'parse', user.role)

  // Call LLM
  const response = await callLLM({
    prompt: `Parse this resume into structured JSON:\n\n${resumeText}`,
    systemMessage: 'You are a resume parser. Return only valid JSON.',
    maxTokens: 2000
  })

  // Log usage
  await logParse(user.id, response.providerType, response.tokensUsed, response.cost)

  // Parse JSON response
  const resumeData = JSON.parse(response.content)

  return resumeData
})
```

### Generate Tailored Resume

```typescript
// server/api/vacancies/[id]/generate.post.ts
export default defineEventHandler(async event => {
  const user = event.context.user
  const vacancyId = getRouterParam(event, 'id')

  // Check limit
  await requireLimit(user.id, 'generate', user.role)

  // Get data
  const vacancy = await vacancyRepository.findById(vacancyId)
  const resume = await resumeRepository.findLatestByUserId(user.id)

  // Call LLM
  const response = await callLLM({
    prompt: `Tailor this resume for this job:\n\nResume: ${JSON.stringify(resume.content)}\n\nJob: ${vacancy.description}`,
    systemMessage: 'You are a resume expert. Optimize the resume for ATS.',
    temperature: 0.7,
    maxTokens: 3000
  })

  // Log usage
  await logGenerate(user.id, response.providerType, response.tokensUsed, response.cost)

  // Save generation
  const generation = await generationRepository.create({
    vacancyId,
    resumeId: resume.id,
    content: JSON.parse(response.content),
    matchScoreBefore: 0, // TODO: calculate
    matchScoreAfter: 0 // TODO: calculate
  })

  return generation
})
```

## Testing

### Mock LLM Service

```typescript
import { vi } from 'vitest'
import * as llmService from '~/server/services/llm'

vi.spyOn(llmService, 'callLLM').mockResolvedValue({
  content: 'Mocked response',
  tokensUsed: 100,
  cost: 0.001,
  model: 'gpt-4o-mini',
  provider: 'openai',
  providerType: 'platform'
})
```

### Test with Real API

```typescript
describe('LLM Service', () => {
  it('should call OpenAI', async () => {
    const response = await callLLM({
      prompt: 'Say hello',
      maxTokens: 10
    })

    expect(response.content).toBeTruthy()
    expect(response.tokensUsed).toBeGreaterThan(0)
    expect(response.cost).toBeGreaterThan(0)
  })
})
```

## Performance

### Cost Optimization

1. **Use cheaper models for simple tasks**:
   - OpenAI: gpt-4o-mini ($0.15/$0.60 per 1M tokens)
   - Gemini: gemini-1.5-flash ($0.075/$0.30 per 1M tokens)

2. **Set appropriate max_tokens**:

   ```typescript
   await callLLM({
     prompt: '...',
     maxTokens: 500 // Don't request more than needed
   })
   ```

3. **Cache results when possible**:

   ```typescript
   const cacheKey = `llm:${hashInput(prompt)}`
   let result = await cache.get(cacheKey)

   if (!result) {
     result = await callLLM({ prompt })
     await cache.set(cacheKey, result, 3600) // 1 hour
   }
   ```

### Rate Limiting

Platform keys are subject to provider rate limits:

- OpenAI: Tier-based (see OpenAI dashboard)
- Gemini: 60 requests/minute (free tier)

Use in-memory rate limiter to prevent hitting these limits:

```typescript
import { checkRateLimit, RateLimitPresets } from '~/server/utils/rate-limiter'

if (!checkRateLimit(userId, 'llm-call', RateLimitPresets.strict)) {
  throw createError({ statusCode: 429, message: 'Too many requests' })
}
```

## Future Enhancements

- **Streaming responses**: Support for streaming LLM output
- **Function calling**: OpenAI function calling support
- **Embeddings**: Support for text embeddings
- **Fine-tuning**: Custom model support
- **More providers**: Anthropic Claude, Mistral, etc.
- **Token counting**: Accurate pre-call token estimation
- **Retry logic**: Automatic retry with exponential backoff

## Related

- **Integration Tests**: TX021 (byok-keys.test.ts)
- **System Config**: T035 (budget tracking)
- **Usage Tracking**: T045 (operation logging)
- **User Stories**: US2 (parse), US3 (generate)
