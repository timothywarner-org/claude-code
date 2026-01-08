/**
 * Segment 4: Documentation Pipeline
 *
 * Automated documentation generation using Claude.
 * Generates API docs, README sections, and changelog entries.
 *
 * Run: npx tsx segment_4_production/02_documentation_pipeline.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { createClient, getModel } from '../src/utils/client.js';
import { logger } from '../src/utils/logger.js';

interface FunctionDoc {
  name: string;
  description: string;
  params: { name: string; type: string; description: string }[];
  returns: { type: string; description: string };
  example?: string;
}

interface ApiDoc {
  title: string;
  description: string;
  functions: FunctionDoc[];
}

/**
 * Extract TypeScript files from a directory
 */
function getTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string): void {
    const entries = readdirSync(currentDir);

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
        walk(fullPath);
      } else if (extname(entry) === '.ts' && !entry.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * Generate API documentation for a TypeScript file
 */
async function generateApiDocs(client: Anthropic, code: string, filename: string): Promise<ApiDoc> {
  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Analyze this TypeScript file and generate API documentation.

File: ${filename}

\`\`\`typescript
${code}
\`\`\`

Return a JSON object with this structure:
{
  "title": "Module name",
  "description": "Brief description of the module",
  "functions": [
    {
      "name": "functionName",
      "description": "What the function does",
      "params": [
        { "name": "paramName", "type": "string", "description": "Parameter description" }
      ],
      "returns": { "type": "returnType", "description": "Return value description" },
      "example": "Optional usage example"
    }
  ]
}

Only include exported functions. Be concise but informative.`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return { title: filename, description: '', functions: [] };
  }

  return JSON.parse(jsonMatch[0]) as ApiDoc;
}

/**
 * Generate markdown from API docs
 */
function generateMarkdown(docs: ApiDoc[]): string {
  let md = '# API Reference\n\n';
  md += 'Auto-generated documentation for the codebase.\n\n';
  md += '---\n\n';

  for (const doc of docs) {
    if (doc.functions.length === 0) continue;

    md += `## ${doc.title}\n\n`;
    md += `${doc.description}\n\n`;

    for (const func of doc.functions) {
      md += `### \`${func.name}\`\n\n`;
      md += `${func.description}\n\n`;

      if (func.params.length > 0) {
        md += '**Parameters:**\n\n';
        md += '| Name | Type | Description |\n';
        md += '|------|------|-------------|\n';
        for (const param of func.params) {
          md += `| \`${param.name}\` | \`${param.type}\` | ${param.description} |\n`;
        }
        md += '\n';
      }

      md += `**Returns:** \`${func.returns.type}\` - ${func.returns.description}\n\n`;

      if (func.example) {
        md += '**Example:**\n\n';
        md += '```typescript\n';
        md += func.example;
        md += '\n```\n\n';
      }

      md += '---\n\n';
    }
  }

  return md;
}

/**
 * Generate README section
 */
async function generateReadmeSection(
  client: Anthropic,
  codeFiles: string[],
  section: 'installation' | 'usage' | 'api'
): Promise<string> {
  const sampleCode = codeFiles.slice(0, 3).map((f) => {
    const content = readFileSync(f, 'utf-8');
    return `// ${f}\n${content.substring(0, 1000)}`;
  }).join('\n\n');

  const prompts = {
    installation: 'Generate an installation section for the README based on this codebase.',
    usage: 'Generate a usage/quick start section with practical examples.',
    api: 'Generate a brief API overview highlighting key functions.',
  };

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `${prompts[section]}

Based on this sample code:

${sampleCode}

Format as markdown. Be concise and practical.`,
      },
    ],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}

/**
 * Generate changelog entry
 */
async function generateChangelog(
  client: Anthropic,
  diff: string,
  version: string
): Promise<string> {
  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Generate a changelog entry for version ${version} based on this diff:

\`\`\`diff
${diff.substring(0, 10000)}
\`\`\`

Use this format:
## [${version}] - ${new Date().toISOString().split('T')[0]}

### Added
- New features

### Changed
- Changes to existing features

### Fixed
- Bug fixes

### Deprecated
- Features to be removed

### Removed
- Removed features

### Security
- Security fixes

Only include relevant sections. Be specific about what changed.`,
      },
    ],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}

/**
 * Main demo - generate documentation
 */
async function main(): Promise<void> {
  logger.section('Documentation Pipeline Demo');

  const client = createClient();

  // Generate API docs for segment files
  logger.subsection('Generating API Documentation');

  const srcDir = join(process.cwd(), 'src');
  const files = getTypeScriptFiles(srcDir);

  logger.info(`Found ${files.length} TypeScript files`, 'Docs');

  const allDocs: ApiDoc[] = [];

  for (const file of files.slice(0, 3)) {
    // Limit for demo
    logger.info(`Processing: ${file}`, 'Docs');
    const code = readFileSync(file, 'utf-8');
    const docs = await generateApiDocs(client, code, file);
    allDocs.push(docs);
  }

  // Generate markdown
  const apiMarkdown = generateMarkdown(allDocs);
  logger.subsection('Generated API Documentation');
  console.log(apiMarkdown.substring(0, 2000) + '...\n');

  // Generate README sections
  logger.subsection('Generating README Sections');

  const usageSection = await generateReadmeSection(client, files, 'usage');
  logger.info('Generated usage section:', 'Docs');
  console.log(usageSection.substring(0, 1000) + '...\n');

  // Demo changelog generation
  logger.subsection('Generating Changelog Entry');

  const sampleDiff = `
diff --git a/src/api.ts b/src/api.ts
+export async function newFeature(): Promise<void> {
+  // New feature implementation
+}

-export function deprecatedFunction() {
+/** @deprecated Use newFeature instead */
+export function deprecatedFunction() {

diff --git a/src/utils.ts b/src/utils.ts
+export function validateInput(input: string): boolean {
+  // Security: Added input validation
+  return /^[a-zA-Z0-9]+$/.test(input);
+}
`;

  const changelog = await generateChangelog(client, sampleDiff, '2.0.0');
  logger.info('Generated changelog:', 'Docs');
  console.log(changelog);

  logger.section('Pipeline Summary');
  console.log(`
Documentation pipeline generated:
- API documentation for ${allDocs.length} modules
- README usage section
- Changelog entry for v2.0.0

To integrate into CI/CD:
1. Add scripts/generate-docs.ts to your repo
2. Configure GitHub Actions to run on release
3. Commit generated docs or publish to docs site
`);
}

main().catch((error) => {
  logger.error(`Pipeline failed: ${error.message}`);
  process.exit(1);
});
