/**
 * Exercise 1: Context Window Loader - SOLUTION
 *
 * This is the complete implementation of the context loader.
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
  maxFileSize?: number;
  includeHidden?: boolean;
}

const DEFAULT_OPTIONS: LoaderOptions = {
  extensions: ['.js', '.ts', '.jsx', '.tsx'],
  excludePatterns: [/node_modules/, /\.git/, /dist/, /build/],
  maxFileSize: 100000,
  includeHidden: false,
};

/**
 * Estimates token count from text content.
 * Rule of thumb: ~4 characters per token for code.
 */
function estimateTokens(content: string): number {
  // More accurate estimation considering:
  // - Whitespace is often compressed
  // - Code has many short tokens (brackets, operators)
  // - Variable names tend to be medium length

  // Remove excessive whitespace for more accurate count
  const normalized = content.replace(/\s+/g, ' ');

  // Average of ~3.5 characters per token for code
  return Math.ceil(normalized.length / 3.5);
}

/**
 * Formats a file's content with a clear header showing the path.
 */
function formatFileContent(filePath: string, content: string): string {
  const separator = '='.repeat(60);
  return `
${separator}
=== FILE: ${filePath} ===
${separator}

${content}

${separator}
=== END FILE: ${filePath} ===
${separator}
`;
}

/**
 * Checks if a path should be excluded based on patterns.
 */
function shouldExclude(filePath: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(filePath));
}

/**
 * Checks if a file has an allowed extension.
 */
function hasAllowedExtension(filePath: string, extensions: string[]): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return extensions.includes(ext);
}

/**
 * Recursively finds all files matching the given options.
 */
function findFiles(directory: string, options: LoaderOptions): string[] {
  const results: string[] = [];
  const { extensions = [], excludePatterns = [], includeHidden = false, maxFileSize = 100000 } = options;

  function walk(dir: string): void {
    let entries: fs.Dirent[];

    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      // Skip directories we cannot read
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip hidden files/directories unless explicitly included
      if (!includeHidden && entry.name.startsWith('.')) {
        continue;
      }

      // Check exclusion patterns
      if (shouldExclude(fullPath, excludePatterns)) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        // Check extension
        if (!hasAllowedExtension(entry.name, extensions)) {
          continue;
        }

        // Check file size
        try {
          const stats = fs.statSync(fullPath);
          if (stats.size > maxFileSize) {
            console.warn(`Skipping large file: ${fullPath} (${stats.size} bytes)`);
            continue;
          }
        } catch {
          continue;
        }

        results.push(fullPath);
      }
    }
  }

  walk(directory);
  return results.sort();
}

/**
 * Main function: Load an entire codebase into a context-ready format.
 */
export async function loadCodebaseContext(
  directory: string,
  options: Partial<LoaderOptions> = {}
): Promise<ContextResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const absoluteDir = path.resolve(directory);

  // Find all matching files
  const filePaths = findFiles(absoluteDir, opts);

  if (filePaths.length === 0) {
    return {
      files: [],
      totalContent: '',
      estimatedTokens: 0,
      fileCount: 0,
    };
  }

  // Read and format each file
  const files: FileContent[] = [];
  const formattedContents: string[] = [];

  // Add a header with context information
  const header = `
${'='.repeat(60)}
CODEBASE CONTEXT
Directory: ${absoluteDir}
Generated: ${new Date().toISOString()}
${'='.repeat(60)}
`;
  formattedContents.push(header);

  for (const filePath of filePaths) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relativePath = path.relative(absoluteDir, filePath);
      const lineCount = content.split('\n').length;

      files.push({
        path: relativePath,
        content,
        lineCount,
      });

      formattedContents.push(formatFileContent(relativePath, content));
    } catch (error) {
      console.warn(`Warning: Could not read file ${filePath}:`, error);
    }
  }

  // Combine all content
  const totalContent = formattedContents.join('\n');
  const estimatedTokens = estimateTokens(totalContent);

  // Warn if approaching context limit
  if (estimatedTokens > 180000) {
    console.warn('\nWARNING: Approaching 200K token limit!');
    console.warn(`Estimated tokens: ${estimatedTokens.toLocaleString()}`);
    console.warn('Consider filtering files or using incremental loading.\n');
  }

  return {
    files,
    totalContent,
    estimatedTokens,
    fileCount: files.length,
  };
}

/**
 * Prints a summary of the loaded context.
 */
function printSummary(result: ContextResult): void {
  console.log('\n=== Context Loading Summary ===');
  console.log(`Files loaded: ${result.fileCount}`);
  console.log(`Estimated tokens: ${result.estimatedTokens.toLocaleString()}`);
  console.log(`Context utilization: ${((result.estimatedTokens / 200000) * 100).toFixed(1)}%`);

  if (result.files.length > 0) {
    console.log('\nFiles included:');
    result.files.forEach((f) => {
      console.log(`  - ${f.path} (${f.lineCount} lines)`);
    });

    // Show top 5 largest files
    const sorted = [...result.files].sort((a, b) => b.lineCount - a.lineCount);
    console.log('\nLargest files:');
    sorted.slice(0, 5).forEach((f) => {
      console.log(`  - ${f.path}: ${f.lineCount} lines`);
    });
  }
}

/**
 * Advanced: Load context with relevance filtering based on a query.
 * Bonus challenge implementation.
 */
export async function loadRelevantContext(
  query: string,
  codebasePath: string,
  maxTokens: number = 100000
): Promise<ContextResult> {
  // First, load all files
  const fullResult = await loadCodebaseContext(codebasePath);

  if (fullResult.estimatedTokens <= maxTokens) {
    return fullResult;
  }

  // Simple relevance scoring based on query keywords
  const keywords = query.toLowerCase().split(/\s+/);

  const scoredFiles = fullResult.files.map((file) => {
    const contentLower = file.content.toLowerCase();
    const pathLower = file.path.toLowerCase();

    let score = 0;
    for (const keyword of keywords) {
      // Path matches are weighted higher
      if (pathLower.includes(keyword)) {
        score += 10;
      }
      // Count content occurrences
      const matches = (contentLower.match(new RegExp(keyword, 'g')) || []).length;
      score += matches;
    }

    return { file, score };
  });

  // Sort by relevance
  scoredFiles.sort((a, b) => b.score - a.score);

  // Select files until we hit the token limit
  const selectedFiles: FileContent[] = [];
  let currentTokens = 0;

  for (const { file, score } of scoredFiles) {
    // Skip files with no relevance if we have some already
    if (score === 0 && selectedFiles.length > 0) {
      continue;
    }

    const fileTokens = estimateTokens(formatFileContent(file.path, file.content));

    if (currentTokens + fileTokens > maxTokens) {
      break;
    }

    selectedFiles.push(file);
    currentTokens += fileTokens;
  }

  // Rebuild the result
  const formattedContents = selectedFiles.map((f) => formatFileContent(f.path, f.content));
  const totalContent = formattedContents.join('\n');

  return {
    files: selectedFiles,
    totalContent,
    estimatedTokens: estimateTokens(totalContent),
    fileCount: selectedFiles.length,
  };
}

// CLI entry point
async function main(): Promise<void> {
  const targetDir = process.argv[2];

  if (!targetDir) {
    console.error('Usage: npx ts-node exercise_1_solution.ts <directory>');
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

    // Write the combined content to a file
    const outputPath = path.join(process.cwd(), 'context_output.txt');
    fs.writeFileSync(outputPath, result.totalContent);
    console.log(`\nFull context written to: ${outputPath}`);
  } catch (error) {
    console.error('Error loading codebase:', error);
    process.exit(1);
  }
}

main();
