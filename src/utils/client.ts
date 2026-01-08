/**
 * Shared Anthropic client configuration
 * Used across all course demos
 */

import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Create a configured Anthropic client
 * Reads API key from ANTHROPIC_API_KEY environment variable
 */
export function createClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY environment variable is required.\n' +
        'Copy .env.example to .env and add your API key.'
    );
  }

  return new Anthropic({
    apiKey,
    maxRetries: 2,
    timeout: 10 * 60 * 1000, // 10 minutes for large context operations
  });
}

/**
 * Get the configured model from environment or use default
 */
export function getModel(): string {
  return process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
}

/**
 * Available Claude models with their capabilities
 */
export const MODELS = {
  // Latest models (recommended)
  'claude-sonnet-4-20250514': {
    name: 'Claude Sonnet 4',
    contextWindow: 200_000,
    inputCost: 3, // per million tokens
    outputCost: 15,
  },
  'claude-sonnet-4-5-20250929': {
    name: 'Claude Sonnet 4.5',
    contextWindow: 200_000, // 1M with beta
    inputCost: 3,
    outputCost: 15,
  },
  'claude-opus-4-5-20251101': {
    name: 'Claude Opus 4.5',
    contextWindow: 200_000,
    inputCost: 15,
    outputCost: 75,
  },
} as const;

export type ModelId = keyof typeof MODELS;

/**
 * Estimate token count (rough approximation)
 * ~4 characters per token for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Format cost estimate for display
 */
export function formatCost(inputTokens: number, outputTokens: number, model: ModelId): string {
  const modelInfo = MODELS[model];
  const inputCost = (inputTokens / 1_000_000) * modelInfo.inputCost;
  const outputCost = (outputTokens / 1_000_000) * modelInfo.outputCost;
  const totalCost = inputCost + outputCost;

  return `$${totalCost.toFixed(4)} (input: $${inputCost.toFixed(4)}, output: $${outputCost.toFixed(4)})`;
}
