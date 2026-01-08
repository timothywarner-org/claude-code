/**
 * Exercise 1: Context Window Loader
 *
 * Your task: Implement the loadCodebaseContext() function to prepare
 * a codebase for analysis with Claude's 200K context window.
 */

import * as fs from 'fs';
import * as path from 'path';

// Types for the context loader
interface FileContent {
  path: string;
  content: string;
  lineCount: number;
}

interface ContextResult {
  files: FileContent[];
  totalContent: string;
  estimatedTokens: number;
  fileCount: number;
}

interface LoaderOptions {
  extensions?: string[];
  excludePatterns?: RegExp[];
  maxFileSize?: number; // in bytes
  includeHidden?: boolean;
}

const DEFAULT_OPTIONS: LoaderOptions = {
  extensions: ['.js', '.ts', '.jsx', '.tsx'],
  excludePatterns: [/node_modules/, /\.git/, /dist/, /build/],
  maxFileSize: 100000, // 100KB
  includeHidden: false,
};

/**
 * Estimates token count from text content.
 * Rule of thumb: ~4 characters per token for code.
 *
 * TODO: Implement this function
 */
function estimateTokens(content: string): number {
  // YOUR CODE HERE
  // Hint: Divide character count by 4 for a rough estimate
  throw new Error('Not implemented');
}

/**
 * Formats a file's content with a clear header showing the path.
 *
 * TODO: Implement this function
 */
function formatFileContent(filePath: string, content: string): string {
  // YOUR CODE HERE
  // Format should be:
  // === FILE: path/to/file.ts ===
  // <content>
  // === END FILE ===
  throw new Error('Not implemented');
}

/**
 * Recursively finds all files matching the given options.
 *
 * TODO: Implement this function
 */
function findFiles(directory: string, options: LoaderOptions): string[] {
  // YOUR CODE HERE
  // 1. Read directory contents
  // 2. Filter by extension
  // 3. Exclude patterns
  // 4. Recurse into subdirectories
  // 5. Return array of absolute file paths
  throw new Error('Not implemented');
}

/**
 * Main function: Load an entire codebase into a context-ready format.
 *
 * TODO: Implement this function
 */
export async function loadCodebaseContext(
  directory: string,
  options: Partial<LoaderOptions> = {}
): Promise<ContextResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // YOUR CODE HERE
  // 1. Find all matching files using findFiles()
  // 2. Read each file's content
  // 3. Format each file using formatFileContent()
  // 4. Combine into a single string
  // 5. Calculate token estimate
  // 6. Return the ContextResult object

  throw new Error('Not implemented');
}

/**
 * Prints a summary of the loaded context.
 */
function printSummary(result: ContextResult): void {
  console.log('\n=== Context Loading Summary ===');
  console.log(`Files loaded: ${result.fileCount}`);
  console.log(`Estimated tokens: ${result.estimatedTokens.toLocaleString()}`);
  console.log(`Context utilization: ${((result.estimatedTokens / 200000) * 100).toFixed(1)}%`);
  console.log('\nFiles included:');
  result.files.forEach((f) => {
    console.log(`  - ${f.path} (${f.lineCount} lines)`);
  });
}

// CLI entry point
async function main(): Promise<void> {
  const targetDir = process.argv[2];

  if (!targetDir) {
    console.error('Usage: npx ts-node exercise_1_starter.ts <directory>');
    process.exit(1);
  }

  const absolutePath = path.resolve(targetDir);

  if (!fs.existsSync(absolutePath)) {
    console.error(`Directory not found: ${absolutePath}`);
    process.exit(1);
  }

  console.log(`Loading codebase from: ${absolutePath}`);

  try {
    const result = await loadCodebaseContext(absolutePath);
    printSummary(result);

    // Optionally write the combined content to a file
    const outputPath = path.join(process.cwd(), 'context_output.txt');
    fs.writeFileSync(outputPath, result.totalContent);
    console.log(`\nFull context written to: ${outputPath}`);
  } catch (error) {
    console.error('Error loading codebase:', error);
    process.exit(1);
  }
}

main();
