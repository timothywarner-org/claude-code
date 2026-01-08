/**
 * Segment 1: Claude's 200K Context Window Demo
 *
 * This demo shows Claude's ability to analyze large amounts of code
 * in a single context window - something other AI assistants can't match.
 *
 * Run: npx tsx segment_1_fundamentals/01_context_window_demo.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { createClient, getModel, estimateTokens, formatCost, type ModelId } from '../src/utils/client.js';
import { logger } from '../src/utils/logger.js';

// File extensions to include in codebase analysis
const CODE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.yml',
  '.yaml',
]);

// Directories to skip
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.next']);

/**
 * Recursively collect all code files from a directory
 */
function collectCodeFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) {
        collectCodeFiles(fullPath, files);
      }
    } else if (CODE_EXTENSIONS.has(extname(entry))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Build a single string containing all code files
 */
function buildCodebaseString(rootDir: string): { content: string; fileCount: number } {
  const files = collectCodeFiles(rootDir);
  let content = '';

  for (const file of files) {
    const relativePath = file.replace(rootDir, '').replace(/\\/g, '/');
    const fileContent = readFileSync(file, 'utf-8');

    content += `\n${'='.repeat(80)}\n`;
    content += `FILE: ${relativePath}\n`;
    content += `${'='.repeat(80)}\n`;
    content += fileContent;
    content += '\n';
  }

  return { content, fileCount: files.length };
}

/**
 * Analyze a codebase using Claude's large context window
 */
async function analyzeCodebase(client: Anthropic, codebase: string): Promise<void> {
  const model = getModel();
  const tokens = estimateTokens(codebase);

  logger.info(`Estimated input tokens: ${tokens.toLocaleString()}`, 'Context');
  logger.info(`Using model: ${model}`, 'Context');

  const systemPrompt = `You are an expert software architect performing a comprehensive codebase analysis.
Analyze the provided codebase and produce a structured report covering:

1. **Architecture Overview**: High-level structure and patterns used
2. **Key Components**: Main modules, their responsibilities, and how they interact
3. **Code Quality**: Strengths and areas for improvement
4. **Security Considerations**: Any potential security issues or best practices missing
5. **Recommendations**: Top 3 actionable improvements

Be specific and reference actual file paths and code when making observations.`;

  logger.subsection('Sending to Claude for analysis...');

  const startTime = Date.now();

  // Use streaming for better UX with large responses
  const stream = client.messages.stream({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Please analyze this codebase:\n\n${codebase}`,
      },
    ],
  });

  // Stream the response
  stream.on('text', (text) => {
    logger.stream(text);
  });

  const finalMessage = await stream.finalMessage();

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const inputTokens = finalMessage.usage.input_tokens;
  const outputTokens = finalMessage.usage.output_tokens;

  console.log('\n');
  logger.section('Analysis Complete');
  logger.info(`Duration: ${duration}s`, 'Stats');
  logger.info(`Input tokens: ${inputTokens.toLocaleString()}`, 'Stats');
  logger.info(`Output tokens: ${outputTokens.toLocaleString()}`, 'Stats');
  logger.info(`Cost: ${formatCost(inputTokens, outputTokens, model as ModelId)}`, 'Stats');
}

/**
 * Demo: Compare context capabilities
 */
function showContextComparison(): void {
  logger.section('Context Window Comparison');

  const comparisons = [
    { name: 'GitHub Copilot', context: '8K', files: '~2-3 files' },
    { name: 'ChatGPT-4', context: '128K', files: '~30-50 files' },
    { name: 'Claude Sonnet/Opus', context: '200K', files: '~100-500 files' },
    { name: 'Claude (Extended)', context: '1M (beta)', files: '~500-2000 files' },
  ];

  console.log('┌─────────────────────┬──────────┬──────────────────┐');
  console.log('│ Model               │ Context  │ Approx. Files    │');
  console.log('├─────────────────────┼──────────┼──────────────────┤');

  for (const c of comparisons) {
    const name = c.name.padEnd(19);
    const context = c.context.padEnd(8);
    const files = c.files.padEnd(16);
    console.log(`│ ${name} │ ${context} │ ${files} │`);
  }

  console.log('└─────────────────────┴──────────┴──────────────────┘\n');
}

/**
 * Main demo runner
 */
async function main(): Promise<void> {
  logger.section('Claude 200K Context Window Demo');

  // Show context comparison
  showContextComparison();

  // Create client
  const client = createClient();

  // Analyze this course repository
  const rootDir = process.cwd();
  logger.info(`Analyzing codebase at: ${rootDir}`, 'Setup');

  const { content, fileCount } = buildCodebaseString(rootDir);
  logger.info(`Collected ${fileCount} files`, 'Setup');
  logger.info(`Total content size: ${(content.length / 1024).toFixed(1)} KB`, 'Setup');

  // Run analysis
  await analyzeCodebase(client, content);
}

main().catch((error) => {
  logger.error(`Demo failed: ${error.message}`);
  process.exit(1);
});
