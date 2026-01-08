#!/usr/bin/env npx tsx
/**
 * Verify Setup Script
 *
 * Checks that the development environment is properly configured
 * for the Claude Code course examples.
 *
 * Run: npx tsx scripts/verify-setup.ts
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: CheckResult[] = [];

function check(name: string, fn: () => { status: 'pass' | 'fail' | 'warn'; message: string }): void {
  try {
    const result = fn();
    results.push({ name, ...result });
  } catch (error) {
    results.push({
      name,
      status: 'fail',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

// Check Node.js version
check('Node.js Version', () => {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);

  if (major >= 20) {
    return { status: 'pass', message: `Node.js ${version} (>= 20 required)` };
  } else if (major >= 18) {
    return { status: 'warn', message: `Node.js ${version} (20+ recommended)` };
  }
  return { status: 'fail', message: `Node.js ${version} (20+ required)` };
});

// Check npm version
check('npm Version', () => {
  const version = execSync('npm --version', { encoding: 'utf-8' }).trim();
  const major = parseInt(version.split('.')[0]);

  if (major >= 10) {
    return { status: 'pass', message: `npm ${version}` };
  }
  return { status: 'warn', message: `npm ${version} (10+ recommended)` };
});

// Check TypeScript
check('TypeScript', () => {
  try {
    const version = execSync('npx tsc --version', { encoding: 'utf-8' }).trim();
    return { status: 'pass', message: version };
  } catch {
    return { status: 'fail', message: 'TypeScript not found. Run: npm install' };
  }
});

// Check Anthropic API key
check('ANTHROPIC_API_KEY', () => {
  if (process.env.ANTHROPIC_API_KEY) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (key.startsWith('sk-ant-')) {
      return { status: 'pass', message: 'API key configured (sk-ant-***)' };
    }
    return { status: 'warn', message: 'API key format may be incorrect' };
  }

  // Check .env file
  const envPath = join(process.cwd(), '.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    if (content.includes('ANTHROPIC_API_KEY=')) {
      return { status: 'warn', message: 'Found in .env but not loaded. Run: source .env' };
    }
  }

  return { status: 'fail', message: 'Not set. Get key from console.anthropic.com' };
});

// Check Claude Code CLI
check('Claude Code CLI', () => {
  try {
    const version = execSync('claude --version', { encoding: 'utf-8' }).trim();
    return { status: 'pass', message: `Installed: ${version}` };
  } catch {
    return {
      status: 'warn',
      message: 'Not installed. Install: npm install -g @anthropic-ai/claude-code',
    };
  }
});

// Check Git
check('Git', () => {
  try {
    const version = execSync('git --version', { encoding: 'utf-8' }).trim();
    return { status: 'pass', message: version };
  } catch {
    return { status: 'fail', message: 'Git not found' };
  }
});

// Check dependencies installed
check('Dependencies', () => {
  const nodeModules = join(process.cwd(), 'node_modules');
  if (!existsSync(nodeModules)) {
    return { status: 'fail', message: 'node_modules not found. Run: npm install' };
  }

  const anthropicSdk = join(nodeModules, '@anthropic-ai/sdk');
  const mcpSdk = join(nodeModules, '@modelcontextprotocol/sdk');

  if (!existsSync(anthropicSdk)) {
    return { status: 'fail', message: '@anthropic-ai/sdk not installed' };
  }
  if (!existsSync(mcpSdk)) {
    return { status: 'fail', message: '@modelcontextprotocol/sdk not installed' };
  }

  return { status: 'pass', message: 'All dependencies installed' };
});

// Check package.json
check('package.json', () => {
  const pkgPath = join(process.cwd(), 'package.json');
  if (!existsSync(pkgPath)) {
    return { status: 'fail', message: 'package.json not found' };
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  if (pkg.type !== 'module') {
    return { status: 'warn', message: 'Missing "type": "module" for ES modules' };
  }

  return { status: 'pass', message: 'Valid configuration' };
});

// Check tsconfig.json
check('tsconfig.json', () => {
  const tsconfigPath = join(process.cwd(), 'tsconfig.json');
  if (!existsSync(tsconfigPath)) {
    return { status: 'fail', message: 'tsconfig.json not found' };
  }

  return { status: 'pass', message: 'TypeScript configured' };
});

// Print results
console.log('\n🔍 Claude Code Course - Environment Check\n');
console.log('━'.repeat(60));

let passCount = 0;
let warnCount = 0;
let failCount = 0;

for (const result of results) {
  let icon: string;
  let color: string;

  switch (result.status) {
    case 'pass':
      icon = '✅';
      color = '\x1b[32m'; // Green
      passCount++;
      break;
    case 'warn':
      icon = '⚠️';
      color = '\x1b[33m'; // Yellow
      warnCount++;
      break;
    case 'fail':
      icon = '❌';
      color = '\x1b[31m'; // Red
      failCount++;
      break;
  }

  console.log(`${icon} ${result.name.padEnd(20)} ${color}${result.message}\x1b[0m`);
}

console.log('━'.repeat(60));
console.log(`\n📊 Results: ${passCount} passed, ${warnCount} warnings, ${failCount} failed\n`);

if (failCount > 0) {
  console.log('❌ Some checks failed. Please fix the issues above before proceeding.\n');
  process.exit(1);
} else if (warnCount > 0) {
  console.log('⚠️  Some warnings detected. Course examples may work but consider fixing.\n');
  process.exit(0);
} else {
  console.log('✅ All checks passed! Environment is ready for the course.\n');
  process.exit(0);
}
