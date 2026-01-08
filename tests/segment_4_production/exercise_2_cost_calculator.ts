/**
 * Exercise 2: Cost Calculator and Optimization Utility
 *
 * This utility helps track and optimize Claude API costs.
 * Complete the implementation to create a production-ready cost tracker.
 *
 * Run with: npx ts-node exercise_2_cost_calculator.ts
 */

// =============================================================================
// Types
// =============================================================================

interface ModelPricing {
  name: string;
  displayName: string;
  inputPer1M: number; // USD per 1M input tokens
  outputPer1M: number; // USD per 1M output tokens
  contextWindow: number;
}

interface UsageRecord {
  id: string;
  timestamp: Date;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  purpose: string;
  metadata?: Record<string, string>;
}

interface BudgetConfig {
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  alertThresholds: number[]; // Percentages, e.g., [50, 75, 90]
  hardLimit: boolean; // If true, reject requests that exceed budget
}

interface CostReport {
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  requestCount: number;
  avgCostPerRequest: number;
  byModel: Record<string, { cost: number; requests: number }>;
  byPurpose: Record<string, { cost: number; requests: number }>;
  topCostDrivers: Array<{ purpose: string; cost: number; percentage: number }>;
  recommendations: string[];
}

interface OptimizationResult {
  originalTokens: number;
  optimizedTokens: number;
  savings: number;
  savingsPercent: number;
  techniques: string[];
}

// =============================================================================
// Model Pricing Configuration
// =============================================================================

const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-opus-4-5-20251101': {
    name: 'claude-opus-4-5-20251101',
    displayName: 'Claude Opus 4.5',
    inputPer1M: 15.0,
    outputPer1M: 75.0,
    contextWindow: 200000,
  },
  'claude-sonnet-4-20250514': {
    name: 'claude-sonnet-4-20250514',
    displayName: 'Claude Sonnet 4',
    inputPer1M: 3.0,
    outputPer1M: 15.0,
    contextWindow: 200000,
  },
  'claude-3-5-sonnet-20241022': {
    name: 'claude-3-5-sonnet-20241022',
    displayName: 'Claude 3.5 Sonnet',
    inputPer1M: 3.0,
    outputPer1M: 15.0,
    contextWindow: 200000,
  },
  'claude-3-opus-20240229': {
    name: 'claude-3-opus-20240229',
    displayName: 'Claude 3 Opus',
    inputPer1M: 15.0,
    outputPer1M: 75.0,
    contextWindow: 200000,
  },
  'claude-3-haiku-20240307': {
    name: 'claude-3-haiku-20240307',
    displayName: 'Claude 3 Haiku',
    inputPer1M: 0.25,
    outputPer1M: 1.25,
    contextWindow: 200000,
  },
};

// =============================================================================
// Token Estimation (simplified - use @anthropic-ai/tokenizer in production)
// =============================================================================

/**
 * Estimate token count for a string.
 * This is a simplified estimation. For production, use the official tokenizer.
 * Rule of thumb: ~4 characters per token for English text.
 */
function estimateTokens(text: string): number {
  if (!text) return 0;

  // More accurate estimation based on content type
  const words = text.split(/\s+/).length;
  const chars = text.length;

  // Code tends to have more tokens per character
  const hasCode = /```|function|const|let|var|class|def |import /.test(text);

  if (hasCode) {
    // Code: roughly 1 token per 3 characters
    return Math.ceil(chars / 3);
  }

  // Prose: roughly 1 token per 4 characters, or 1.3 tokens per word
  return Math.ceil(Math.max(chars / 4, words * 1.3));
}

// =============================================================================
// Cost Calculator
// =============================================================================

class CostCalculator {
  /**
   * Calculate cost for a given model and token counts
   */
  static calculate(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model];

    if (!pricing) {
      console.warn(`Unknown model: ${model}, using Claude 3.5 Sonnet pricing`);
      return this.calculate('claude-3-5-sonnet-20241022', inputTokens, outputTokens);
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;

    return inputCost + outputCost;
  }

  /**
   * Estimate cost before making an API call
   */
  static estimate(
    model: string,
    promptText: string,
    expectedOutputTokens?: number
  ): { inputTokens: number; outputTokens: number; estimatedCost: number } {
    const inputTokens = estimateTokens(promptText);
    const outputTokens = expectedOutputTokens || Math.min(inputTokens * 2, 4096);

    return {
      inputTokens,
      outputTokens,
      estimatedCost: this.calculate(model, inputTokens, outputTokens),
    };
  }

  /**
   * Compare costs across different models
   */
  static compareModels(
    inputTokens: number,
    outputTokens: number
  ): Array<{ model: string; displayName: string; cost: number }> {
    return Object.values(MODEL_PRICING)
      .map((pricing) => ({
        model: pricing.name,
        displayName: pricing.displayName,
        cost: this.calculate(pricing.name, inputTokens, outputTokens),
      }))
      .sort((a, b) => a.cost - b.cost);
  }

  /**
   * Recommend optimal model based on task and budget
   */
  static recommendModel(
    task: 'simple' | 'standard' | 'complex',
    inputTokens: number,
    maxBudget?: number
  ): string {
    const recommendations = {
      simple: 'claude-3-haiku-20240307',
      standard: 'claude-3-5-sonnet-20241022',
      complex: 'claude-opus-4-5-20251101',
    };

    let recommended = recommendations[task];

    // Check if recommended model fits budget
    if (maxBudget !== undefined) {
      const estimatedOutput = Math.min(inputTokens, 4096);
      const cost = this.calculate(recommended, inputTokens, estimatedOutput);

      if (cost > maxBudget) {
        // Downgrade to cheaper model
        const cheaper = this.compareModels(inputTokens, estimatedOutput);
        const affordable = cheaper.find((m) => m.cost <= maxBudget);

        if (affordable) {
          recommended = affordable.model;
        }
      }
    }

    return recommended;
  }
}

// =============================================================================
// Usage Tracker
// =============================================================================

class UsageTracker {
  private records: UsageRecord[] = [];
  private budgetConfig: BudgetConfig;
  private alertsSent: Set<string> = new Set();

  constructor(budgetConfig?: Partial<BudgetConfig>) {
    this.budgetConfig = {
      dailyLimit: 50,
      weeklyLimit: 200,
      monthlyLimit: 500,
      alertThresholds: [50, 75, 90],
      hardLimit: false,
      ...budgetConfig,
    };
  }

  /**
   * Log a usage record
   */
  log(record: Omit<UsageRecord, 'id'>): UsageRecord {
    const fullRecord: UsageRecord = {
      ...record,
      id: `usage_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    };

    this.records.push(fullRecord);
    this.checkAlerts();

    return fullRecord;
  }

  /**
   * Check if a request would exceed budget
   */
  wouldExceedBudget(estimatedCost: number): boolean {
    if (!this.budgetConfig.hardLimit) return false;

    const daily = this.getUsage('daily') + estimatedCost;
    const weekly = this.getUsage('weekly') + estimatedCost;
    const monthly = this.getUsage('monthly') + estimatedCost;

    return (
      daily > this.budgetConfig.dailyLimit ||
      weekly > this.budgetConfig.weeklyLimit ||
      monthly > this.budgetConfig.monthlyLimit
    );
  }

  /**
   * Get usage for a time period
   */
  getUsage(period: 'hourly' | 'daily' | 'weekly' | 'monthly'): number {
    const now = new Date();
    let cutoff: Date;

    switch (period) {
      case 'hourly':
        cutoff = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'daily':
        cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    return this.records.filter((r) => r.timestamp >= cutoff).reduce((sum, r) => sum + r.cost, 0);
  }

  /**
   * Generate cost report
   */
  generateReport(period: 'hourly' | 'daily' | 'weekly' | 'monthly'): CostReport {
    const now = new Date();
    let cutoff: Date;

    switch (period) {
      case 'hourly':
        cutoff = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'daily':
        cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const periodRecords = this.records.filter((r) => r.timestamp >= cutoff);

    const byModel: Record<string, { cost: number; requests: number }> = {};
    const byPurpose: Record<string, { cost: number; requests: number }> = {};

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;

    for (const record of periodRecords) {
      totalInputTokens += record.inputTokens;
      totalOutputTokens += record.outputTokens;
      totalCost += record.cost;

      // By model
      if (!byModel[record.model]) {
        byModel[record.model] = { cost: 0, requests: 0 };
      }
      byModel[record.model].cost += record.cost;
      byModel[record.model].requests++;

      // By purpose
      if (!byPurpose[record.purpose]) {
        byPurpose[record.purpose] = { cost: 0, requests: 0 };
      }
      byPurpose[record.purpose].cost += record.cost;
      byPurpose[record.purpose].requests++;
    }

    // Top cost drivers
    const topCostDrivers = Object.entries(byPurpose)
      .map(([purpose, data]) => ({
        purpose,
        cost: data.cost,
        percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    // Generate recommendations
    const recommendations = this.generateRecommendations(periodRecords, byModel, byPurpose);

    return {
      period,
      startDate: cutoff,
      endDate: now,
      totalCost,
      totalInputTokens,
      totalOutputTokens,
      requestCount: periodRecords.length,
      avgCostPerRequest: periodRecords.length > 0 ? totalCost / periodRecords.length : 0,
      byModel,
      byPurpose,
      topCostDrivers,
      recommendations,
    };
  }

  private generateRecommendations(
    records: UsageRecord[],
    byModel: Record<string, { cost: number; requests: number }>,
    byPurpose: Record<string, { cost: number; requests: number }>
  ): string[] {
    const recommendations: string[] = [];

    // Check for Opus usage that could use Sonnet
    const opusUsage = byModel['claude-3-opus-20240229'];
    if (opusUsage && opusUsage.requests > 10) {
      recommendations.push(
        'Consider using Claude 3.5 Sonnet instead of Opus for suitable tasks - 5x cost reduction'
      );
    }

    // Check for high-frequency purposes
    for (const [purpose, data] of Object.entries(byPurpose)) {
      if (data.requests > 50 && data.cost / data.requests < 0.01) {
        recommendations.push(
          `High-frequency, low-cost "${purpose}" calls may benefit from batching`
        );
      }
    }

    // Check input/output ratio
    let totalInput = 0;
    let totalOutput = 0;
    for (const r of records) {
      totalInput += r.inputTokens;
      totalOutput += r.outputTokens;
    }

    if (totalInput > 0 && totalOutput / totalInput < 0.1) {
      recommendations.push(
        'Low output/input ratio suggests prompts could be more concise'
      );
    }

    // Check for potential caching opportunities
    const purposes = Object.keys(byPurpose);
    if (purposes.some((p) => p.includes('lookup') || p.includes('search'))) {
      recommendations.push('Implement response caching for repeated lookups');
    }

    return recommendations;
  }

  private checkAlerts(): void {
    const periods: Array<'daily' | 'weekly' | 'monthly'> = ['daily', 'weekly', 'monthly'];
    const limits = {
      daily: this.budgetConfig.dailyLimit,
      weekly: this.budgetConfig.weeklyLimit,
      monthly: this.budgetConfig.monthlyLimit,
    };

    for (const period of periods) {
      const usage = this.getUsage(period);
      const limit = limits[period];
      const percentage = (usage / limit) * 100;

      for (const threshold of this.budgetConfig.alertThresholds) {
        const alertKey = `${period}_${threshold}`;

        if (percentage >= threshold && !this.alertsSent.has(alertKey)) {
          console.warn(
            `BUDGET ALERT: ${period} usage at ${percentage.toFixed(1)}% ($${usage.toFixed(2)} / $${limit})`
          );
          this.alertsSent.add(alertKey);
        }
      }
    }
  }

  /**
   * Export records for analysis
   */
  export(): UsageRecord[] {
    return [...this.records];
  }

  /**
   * Import historical records
   */
  import(records: UsageRecord[]): void {
    this.records.push(...records);
  }
}

// =============================================================================
// Prompt Optimizer
// =============================================================================

class PromptOptimizer {
  /**
   * Analyze and optimize a prompt for cost efficiency
   */
  static optimize(prompt: string): OptimizationResult {
    const originalTokens = estimateTokens(prompt);
    let optimized = prompt;
    const techniques: string[] = [];

    // Remove excessive whitespace
    const beforeWhitespace = optimized;
    optimized = optimized.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ');
    if (optimized.length < beforeWhitespace.length) {
      techniques.push('Removed excessive whitespace');
    }

    // Remove redundant instructions
    const redundantPatterns = [
      /please\s+/gi,
      /could you\s+/gi,
      /i would like you to\s+/gi,
      /kindly\s+/gi,
    ];
    for (const pattern of redundantPatterns) {
      if (pattern.test(optimized)) {
        optimized = optimized.replace(pattern, '');
        techniques.push('Removed verbose phrasing');
        break;
      }
    }

    // Suggest format optimization
    if (optimized.includes('```') && optimized.split('```').length > 5) {
      techniques.push('Consider consolidating code blocks');
    }

    const optimizedTokens = estimateTokens(optimized);
    const savings = originalTokens - optimizedTokens;

    return {
      originalTokens,
      optimizedTokens,
      savings,
      savingsPercent: originalTokens > 0 ? (savings / originalTokens) * 100 : 0,
      techniques,
    };
  }

  /**
   * Truncate content to fit token budget
   */
  static truncateToFit(content: string, maxTokens: number, preserveEndings = true): string {
    const currentTokens = estimateTokens(content);

    if (currentTokens <= maxTokens) {
      return content;
    }

    // Estimate characters per token
    const ratio = content.length / currentTokens;
    const targetChars = Math.floor(maxTokens * ratio * 0.95); // 5% buffer

    if (preserveEndings) {
      // Keep first 80% and last 20%
      const firstPart = Math.floor(targetChars * 0.8);
      const lastPart = targetChars - firstPart;

      return content.slice(0, firstPart) + '\n...(truncated)...\n' + content.slice(-lastPart);
    }

    return content.slice(0, targetChars) + '\n...(truncated)';
  }
}

// =============================================================================
// Demo Usage
// =============================================================================

function demo() {
  console.log('=== Claude API Cost Calculator Demo ===\n');

  // 1. Estimate costs for a prompt
  const samplePrompt = `
    Analyze this code and provide feedback:

    \`\`\`javascript
    function processData(items) {
      let results = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].active) {
          results.push(items[i].value * 2);
        }
      }
      return results;
    }
    \`\`\`

    Focus on performance, readability, and best practices.
  `;

  console.log('1. Cost Estimation');
  console.log('-'.repeat(40));

  const estimate = CostCalculator.estimate('claude-3-5-sonnet-20241022', samplePrompt);
  console.log(`Input tokens: ${estimate.inputTokens}`);
  console.log(`Expected output: ${estimate.outputTokens}`);
  console.log(`Estimated cost: $${estimate.estimatedCost.toFixed(4)}`);

  // 2. Compare models
  console.log('\n2. Model Comparison');
  console.log('-'.repeat(40));

  const comparison = CostCalculator.compareModels(1000, 500);
  for (const model of comparison) {
    console.log(`${model.displayName}: $${model.cost.toFixed(4)}`);
  }

  // 3. Usage tracking
  console.log('\n3. Usage Tracking');
  console.log('-'.repeat(40));

  const tracker = new UsageTracker({
    dailyLimit: 10,
    alertThresholds: [50, 80],
  });

  // Simulate some usage
  for (let i = 0; i < 5; i++) {
    tracker.log({
      timestamp: new Date(),
      model: 'claude-3-5-sonnet-20241022',
      inputTokens: 500 + Math.random() * 500,
      outputTokens: 200 + Math.random() * 300,
      cost: 0.005 + Math.random() * 0.01,
      purpose: ['code-review', 'documentation', 'testing'][i % 3],
    });
  }

  console.log(`Daily usage: $${tracker.getUsage('daily').toFixed(4)}`);

  // 4. Generate report
  console.log('\n4. Cost Report');
  console.log('-'.repeat(40));

  const report = tracker.generateReport('daily');
  console.log(`Total cost: $${report.totalCost.toFixed(4)}`);
  console.log(`Request count: ${report.requestCount}`);
  console.log(`Avg cost/request: $${report.avgCostPerRequest.toFixed(4)}`);

  if (report.recommendations.length > 0) {
    console.log('\nRecommendations:');
    for (const rec of report.recommendations) {
      console.log(`  - ${rec}`);
    }
  }

  // 5. Prompt optimization
  console.log('\n5. Prompt Optimization');
  console.log('-'.repeat(40));

  const verbosePrompt = `
    Please could you kindly analyze the following code and
    I would like you to provide detailed feedback on it.


    The code is shown below:
    \`\`\`
    function test() { return 1; }
    \`\`\`


  `;

  const optimization = PromptOptimizer.optimize(verbosePrompt);
  console.log(`Original tokens: ${optimization.originalTokens}`);
  console.log(`Optimized tokens: ${optimization.optimizedTokens}`);
  console.log(`Savings: ${optimization.savingsPercent.toFixed(1)}%`);
  console.log(`Techniques: ${optimization.techniques.join(', ')}`);
}

// Run demo
demo();

// Export for use in other modules
export { CostCalculator, UsageTracker, PromptOptimizer, estimateTokens, MODEL_PRICING };
export type { UsageRecord, BudgetConfig, CostReport, OptimizationResult };
