/**
 * Simple logger utility for course demos
 * Provides consistent, colorful console output
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: COLORS.dim,
  info: COLORS.cyan,
  warn: COLORS.yellow,
  error: COLORS.red,
};

const LEVEL_LABELS: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info: 'INFO ',
  warn: 'WARN ',
  error: 'ERROR',
};

function getLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
  return ['debug', 'info', 'warn', 'error'].includes(level) ? level : 'info';
}

const LOG_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  const currentLevel = getLogLevel();
  return LOG_PRIORITY[level] >= LOG_PRIORITY[currentLevel];
}

function formatMessage(level: LogLevel, message: string, context?: string): string {
  const timestamp = new Date().toISOString().substring(11, 23);
  const color = LEVEL_COLORS[level];
  const label = LEVEL_LABELS[level];
  const contextStr = context ? `${COLORS.magenta}[${context}]${COLORS.reset} ` : '';

  return `${COLORS.dim}${timestamp}${COLORS.reset} ${color}${label}${COLORS.reset} ${contextStr}${message}`;
}

export const logger = {
  debug(message: string, context?: string): void {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message, context));
    }
  },

  info(message: string, context?: string): void {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message, context));
    }
  },

  warn(message: string, context?: string): void {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, context));
    }
  },

  error(message: string, context?: string): void {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message, context));
    }
  },

  /** Log a section header */
  section(title: string): void {
    const line = '═'.repeat(60);
    console.log(`\n${COLORS.bright}${COLORS.cyan}${line}${COLORS.reset}`);
    console.log(`${COLORS.bright}${COLORS.cyan}  ${title}${COLORS.reset}`);
    console.log(`${COLORS.bright}${COLORS.cyan}${line}${COLORS.reset}\n`);
  },

  /** Log a subsection */
  subsection(title: string): void {
    console.log(`\n${COLORS.bright}${COLORS.green}▶ ${title}${COLORS.reset}\n`);
  },

  /** Log streaming text (no newline) */
  stream(text: string): void {
    process.stdout.write(text);
  },

  /** Log a code block */
  code(code: string, language = ''): void {
    console.log(`\n${COLORS.dim}┌─ ${language}${COLORS.reset}`);
    code.split('\n').forEach((line) => {
      console.log(`${COLORS.dim}│${COLORS.reset} ${line}`);
    });
    console.log(`${COLORS.dim}└─${COLORS.reset}\n`);
  },

  /** Log a JSON object with pretty formatting */
  json(obj: unknown, label?: string): void {
    if (label) {
      console.log(`${COLORS.cyan}${label}:${COLORS.reset}`);
    }
    console.log(JSON.stringify(obj, null, 2));
  },
};
