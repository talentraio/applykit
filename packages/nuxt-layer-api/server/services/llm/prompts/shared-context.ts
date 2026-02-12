/**
 * Shared prompt primitives.
 *
 * Keep the leading prompt prefix stable between adaptation and scoring calls
 * to maximize provider-side prompt cache hits (especially OpenAI auto caching).
 */

const SHARED_CONTEXT_BLOCK_START = 'SHARED_CONTEXT_START';
const SHARED_CONTEXT_BLOCK_END = 'SHARED_CONTEXT_END';

export const GENERATE_SHARED_SYSTEM_PROMPT = `You are an expert resume optimization assistant.

Use only provided data and task instructions.
Never invent facts.
When a task requests JSON output, return valid JSON only.`;

export function createSharedContextPromptPrefix(sharedContext: string): string {
  return `${SHARED_CONTEXT_BLOCK_START}
${sharedContext}
${SHARED_CONTEXT_BLOCK_END}`;
}
