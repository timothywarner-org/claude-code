/**
 * Anthropic Client Utilities
 *
 * Factory functions for creating and configuring the Anthropic client.
 * Handles API key validation, model selection, and cost estimation.
 */

import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

// Available model IDs
export type ModelId =
  | 'claude-sonnet-4-20250514'
  | 'claude-sonnet-4-5-20250929'
  | 'claude-opus-4-5-20251101';

// Model pricing (per million tokens as of 2025)
const MODEL_PRICING: Record<ModelId, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-sonnet-4-5-20250929': { input: 3, output: 15 },
  'claude-opus-4-5-20251101': { input: 15, output: 75 },
};

/**
 * Create an Anthropic client instance
 * @throws Error if ANTHROPIC_API_KEY is not set
 */
export function createClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY environment variable is required.\n' +
        'Set it with: export ANTHROPIC_API_KEY=sk-ant-api03-...'
    );
  }

  return new Anthropic({ apiKey });
}

/**
 * Get the configured model ID
 * Falls back to claude-sonnet-4-20250514 if not specified
 */
export function getModel(): ModelId {
  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
  return model as ModelId;
}

/**
 * Estimate tokens for a string (rough approximation)
 * ~4 characters per token for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Format cost for display
 * @param inputTokens Number of input tokens
 * @param outputTokens Number of output tokens
 * @param model Model ID for pricing lookup
 */
export function formatCost(
  inputTokens: number,
  outputTokens: number,
  model: ModelId
): string {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['claude-sonnet-4-20250514'];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const totalCost = inputCost + outputCost;

  if (totalCost < 0.01) {
    return `$${(totalCost * 100).toFixed(3)}¢`;
  }
  return `$${totalCost.toFixed(4)}`;
}

/**
 * Validate that the API key is working
 */
export async function validateApiKey(client: Anthropic): Promise<boolean> {
  try {
    await client.messages.create({
      model: getModel(),
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }],
    });
    return true;
  } catch {
    return false;
  }
}
