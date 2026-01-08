# Cost Optimization Guide

## Understanding Claude Pricing

### Current Model Pricing (2025)

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Best For |
|-------|----------------------|------------------------|----------|
| Claude Sonnet 4 | $3.00 | $15.00 | General development tasks |
| Claude Sonnet 4.5 | $3.00 | $15.00 | Complex reasoning |
| Claude Opus 4.5 | $15.00 | $75.00 | Most demanding tasks |

### Token Estimation

```typescript
// Rough estimation: ~4 characters per token for English text
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// More accurate for code: ~3 characters per token
function estimateCodeTokens(code: string): number {
  return Math.ceil(code.length / 3);
}
```

## Cost Reduction Strategies

### 1. Model Selection

```typescript
// Use the right model for the task
const MODEL_BY_TASK = {
  // Sonnet for most tasks
  codeReview: 'claude-sonnet-4-20250514',
  documentation: 'claude-sonnet-4-20250514',
  simpleQuestions: 'claude-sonnet-4-20250514',

  // Opus only for complex tasks
  architectureDesign: 'claude-opus-4-5-20251101',
  securityAudit: 'claude-opus-4-5-20251101',
  complexRefactoring: 'claude-opus-4-5-20251101',
};
```

### 2. Prompt Engineering

```typescript
// DON'T: Verbose prompts
const badPrompt = `
I would like you to please review this code and tell me if there are
any issues with it. Please be thorough and check for security issues,
performance problems, code style violations, and anything else you
think might be important. Here is the code:
${code}
`;

// DO: Concise prompts
const goodPrompt = `
Review for: security, performance, style issues.
Return JSON: [{ severity, file, line, message }]

\`\`\`
${code}
\`\`\`
`;
```

### 3. Context Management

```typescript
// DON'T: Send entire codebase every time
const allCode = readAllFiles('./src'); // 100KB+

// DO: Send only relevant context
const relevantFiles = getChangedFiles(); // 5-10KB
const relatedCode = findRelatedImports(relevantFiles); // 10-20KB
```

### 4. Caching

```typescript
import { createHash } from 'crypto';

const responseCache = new Map<string, string>();

async function cachedCompletion(prompt: string): Promise<string> {
  const hash = createHash('sha256').update(prompt).digest('hex');

  if (responseCache.has(hash)) {
    console.log('Cache hit!');
    return responseCache.get(hash)!;
  }

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  responseCache.set(hash, text);

  return text;
}
```

### 5. Batching

```typescript
// DON'T: Multiple API calls
for (const file of files) {
  await reviewFile(file); // N API calls
}

// DO: Batch into single call (when possible)
const allFiles = files.map(f => `## ${f.name}\n${f.content}`).join('\n\n');
await reviewAllFiles(allFiles); // 1 API call
```

### 6. Streaming for UX (No Cost Impact)

```typescript
// Streaming costs the same but improves perceived performance
const stream = client.messages.stream({
  model: getModel(),
  max_tokens: 2048,
  messages: [{ role: 'user', content: prompt }],
});

stream.on('text', (text) => {
  process.stdout.write(text); // Show progress
});
```

## When to Use Claude vs Alternatives

### Use Claude For

| Task | Why Claude |
|------|------------|
| Full codebase analysis | 200K context window |
| Complex refactoring | Superior reasoning |
| Security audits | Thorough analysis |
| Architecture decisions | Context retention |
| Multi-file changes | Cross-file understanding |

### Use Copilot/Other Tools For

| Task | Why Alternative |
|------|-----------------|
| Line-by-line autocomplete | Copilot optimized for this |
| Simple boilerplate | Faster, cheaper |
| Repetitive patterns | Fine-tuned models |
| Syntax completion | Real-time suggestions |

### Use Traditional Tools For

| Task | Why Traditional |
|------|-----------------|
| Formatting | Prettier is free |
| Linting rules | ESLint is faster |
| Type checking | TypeScript compiler |
| Simple regex replacements | sed/awk are instant |

## Cost Monitoring

### Track Usage

```typescript
interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  requests: number;
  estimatedCost: number;
}

const stats: UsageStats = {
  inputTokens: 0,
  outputTokens: 0,
  requests: 0,
  estimatedCost: 0,
};

function trackUsage(response: Anthropic.Message): void {
  stats.inputTokens += response.usage.input_tokens;
  stats.outputTokens += response.usage.output_tokens;
  stats.requests++;

  // Calculate cost (Sonnet pricing)
  stats.estimatedCost =
    (stats.inputTokens / 1_000_000) * 3 +
    (stats.outputTokens / 1_000_000) * 15;
}

function reportUsage(): void {
  console.log(`
Usage Report:
- Requests: ${stats.requests}
- Input tokens: ${stats.inputTokens.toLocaleString()}
- Output tokens: ${stats.outputTokens.toLocaleString()}
- Estimated cost: $${stats.estimatedCost.toFixed(4)}
  `);
}
```

### Set Budgets

```typescript
const DAILY_BUDGET = 10; // $10/day
const MONTHLY_BUDGET = 200; // $200/month

async function checkBudget(): Promise<boolean> {
  const todaySpend = await getTodaySpend();
  const monthSpend = await getMonthSpend();

  if (todaySpend >= DAILY_BUDGET) {
    console.warn('Daily budget exceeded!');
    return false;
  }

  if (monthSpend >= MONTHLY_BUDGET) {
    console.warn('Monthly budget exceeded!');
    return false;
  }

  return true;
}
```

## Cost Comparison Examples

### Code Review (100 file PR)

| Approach | Tokens | Cost |
|----------|--------|------|
| Full codebase + diff | ~150K | ~$0.60 |
| Diff only | ~30K | ~$0.12 |
| Diff + related files | ~50K | ~$0.20 |

**Recommendation:** Diff + related files (best balance)

### Documentation Generation

| Approach | Tokens | Cost |
|----------|--------|------|
| Entire codebase | ~200K | ~$0.75 |
| Per-file (50 files) | ~100K | ~$0.40 |
| Summary + examples | ~20K | ~$0.08 |

**Recommendation:** Per-file for accuracy, summary for speed

### Daily Development (8 hours)

| Usage Pattern | Est. Tokens | Daily Cost |
|---------------|-------------|------------|
| Heavy (constant use) | ~500K | ~$2.00 |
| Moderate (hourly) | ~100K | ~$0.40 |
| Light (as needed) | ~20K | ~$0.08 |

## Budget Planning Template

```markdown
## Monthly Claude Budget

### Team Size: 5 developers

### Estimated Usage:
- Code reviews: 100 PRs × $0.20 = $20
- Documentation: 10 updates × $0.50 = $5
- Development assistance: 5 devs × $30 = $150
- CI/CD automation: 200 runs × $0.10 = $20

### Total: $195/month

### Buffer (20%): $39

### Budget: $234/month
```
