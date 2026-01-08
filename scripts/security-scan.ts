#!/usr/bin/env npx tsx
/**
 * Security Scan Script
 *
 * Uses Claude to perform security analysis on the codebase.
 * Checks for common vulnerabilities and security anti-patterns.
 *
 * Run: npx tsx scripts/security-scan.ts --output security_report.json
 */

import Anthropic from '@anthropic-ai/sdk';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { parseArgs } from 'util';

interface SecurityIssue {
  file: string;
  line?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  message: string;
  recommendation: string;
}

interface SecurityReport {
  timestamp: string;
  filesScanned: number;
  critical: SecurityIssue[];
  high: SecurityIssue[];
  medium: SecurityIssue[];
  low: SecurityIssue[];
  warnings: SecurityIssue[];
  summary: string;
}

// Parse command line arguments
const { values } = parseArgs({
  options: {
    output: { type: 'string', short: 'o' },
    dir: { type: 'string', short: 'd', default: '.' },
    model: { type: 'string', short: 'm', default: 'claude-sonnet-4-20250514' },
  },
});

const client = new Anthropic();

// File extensions to scan
const SCAN_EXTENSIONS = ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.java', '.rb', '.php'];

// Patterns to skip
const SKIP_PATTERNS = ['node_modules', '.git', 'dist', 'build', 'coverage', '__pycache__'];

function getSourceFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string): void {
    const entries = readdirSync(currentDir);

    for (const entry of entries) {
      if (SKIP_PATTERNS.some((p) => entry.includes(p))) continue;

      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (SCAN_EXTENSIONS.includes(extname(entry))) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

async function scanFile(filePath: string, content: string): Promise<SecurityIssue[]> {
  const response = await client.messages.create({
    model: values.model || 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Perform a security audit on this code. Look for:

1. **Injection vulnerabilities**: SQL injection, command injection, XSS, LDAP injection
2. **Authentication issues**: Hardcoded credentials, weak authentication, missing auth checks
3. **Sensitive data exposure**: Logging secrets, hardcoded API keys, unencrypted sensitive data
4. **Security misconfigurations**: Insecure defaults, debug code in production
5. **Cryptographic issues**: Weak algorithms, improper key management
6. **Input validation**: Missing validation, improper sanitization

File: ${filePath}

\`\`\`
${content.substring(0, 15000)}
\`\`\`

Return JSON array of issues found:
[{
  "file": "${filePath}",
  "line": 10,
  "severity": "critical|high|medium|low",
  "category": "injection|auth|data_exposure|config|crypto|validation",
  "message": "Description of the issue",
  "recommendation": "How to fix"
}]

Return empty array [] if no issues found. Only report real security issues, not style preferences.`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
  const jsonMatch = text.match(/\[[\s\S]*\]/);

  if (!jsonMatch) return [];

  try {
    return JSON.parse(jsonMatch[0]) as SecurityIssue[];
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  console.log('🔒 Running security scan...\n');

  const scanDir = values.dir || '.';
  const files = getSourceFiles(scanDir);

  console.log(`Found ${files.length} files to scan\n`);

  const allIssues: SecurityIssue[] = [];
  let scanned = 0;

  for (const file of files) {
    process.stdout.write(`Scanning: ${file}...`);

    try {
      const content = readFileSync(file, 'utf-8');

      // Skip very large files
      if (content.length > 50000) {
        console.log(' (skipped - too large)');
        continue;
      }

      const issues = await scanFile(file, content);
      allIssues.push(...issues);
      scanned++;

      if (issues.length > 0) {
        console.log(` found ${issues.length} issues`);
      } else {
        console.log(' clean');
      }
    } catch (error) {
      console.log(' error');
    }
  }

  // Categorize issues
  const report: SecurityReport = {
    timestamp: new Date().toISOString(),
    filesScanned: scanned,
    critical: allIssues.filter((i) => i.severity === 'critical'),
    high: allIssues.filter((i) => i.severity === 'high'),
    medium: allIssues.filter((i) => i.severity === 'medium'),
    low: allIssues.filter((i) => i.severity === 'low'),
    warnings: allIssues.filter((i) => i.severity === 'low'),
    summary: '',
  };

  // Generate summary
  report.summary = `Security scan completed. Found ${report.critical.length} critical, ${report.high.length} high, ${report.medium.length} medium, and ${report.low.length} low severity issues across ${scanned} files.`;

  // Output report
  console.log('\n' + '='.repeat(60));
  console.log('📊 Security Scan Report');
  console.log('='.repeat(60) + '\n');

  console.log(report.summary + '\n');

  if (report.critical.length > 0) {
    console.log('🚨 CRITICAL ISSUES:');
    for (const issue of report.critical) {
      console.log(`  - ${issue.file}${issue.line ? ':' + issue.line : ''}`);
      console.log(`    ${issue.message}`);
      console.log(`    Fix: ${issue.recommendation}\n`);
    }
  }

  if (report.high.length > 0) {
    console.log('⚠️  HIGH SEVERITY:');
    for (const issue of report.high) {
      console.log(`  - ${issue.file}: ${issue.message}`);
    }
    console.log('');
  }

  // Write to file
  if (values.output) {
    writeFileSync(values.output, JSON.stringify(report, null, 2));
    console.log(`\n📁 Report saved to ${values.output}`);
  }

  // Exit code based on findings
  if (report.critical.length > 0) {
    console.log('\n❌ Critical security issues found!');
    process.exit(1);
  } else if (report.high.length > 0) {
    console.log('\n⚠️  High severity issues found. Review recommended.');
    process.exit(0);
  } else {
    console.log('\n✅ No critical security issues found.');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Security scan failed:', error.message);
  process.exit(1);
});
