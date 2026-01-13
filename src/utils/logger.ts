/**
 * Logger Utility
 *
 * Colorful, structured logging for demos and course content.
 * Uses ANSI colors for terminal output.
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

/**
 * Logger for structured, colorful console output
 */
export const logger = {
  /**
   * Print a major section header
   */
  section(title: string): void {
    const line = '═'.repeat(Math.max(60, title.length + 4));
    console.log(`\n${colors.cyan}${colors.bold}${line}${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}  ${title}${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}${line}${colors.reset}\n`);
  },

  /**
   * Print a subsection header
   */
  subsection(title: string): void {
    console.log(`\n${colors.blue}${colors.bold}▶ ${title}${colors.reset}\n`);
  },

  /**
   * Print an info message with optional category
   */
  info(message: string, category?: string): void {
    const prefix = category
      ? `${colors.gray}[${category}]${colors.reset} `
      : '';
    console.log(`${prefix}${colors.green}ℹ${colors.reset} ${message}`);
  },

  /**
   * Print a warning message
   */
  warn(message: string, category?: string): void {
    const prefix = category
      ? `${colors.gray}[${category}]${colors.reset} `
      : '';
    console.log(`${prefix}${colors.yellow}⚠${colors.reset} ${colors.yellow}${message}${colors.reset}`);
  },

  /**
   * Print an error message
   */
  error(message: string, category?: string): void {
    const prefix = category
      ? `${colors.gray}[${category}]${colors.reset} `
      : '';
    console.log(`${prefix}${colors.red}✖${colors.reset} ${colors.red}${message}${colors.reset}`);
  },

  /**
   * Print a success message
   */
  success(message: string, category?: string): void {
    const prefix = category
      ? `${colors.gray}[${category}]${colors.reset} `
      : '';
    console.log(`${prefix}${colors.green}✔${colors.reset} ${colors.green}${message}${colors.reset}`);
  },

  /**
   * Print a debug message (dimmed)
   */
  debug(message: string): void {
    console.log(`${colors.dim}${message}${colors.reset}`);
  },

  /**
   * Print a code block with syntax highlighting hint
   */
  code(code: string, language?: string): void {
    const lang = language ? `${colors.gray}${language}${colors.reset}\n` : '';
    console.log(`${lang}${colors.dim}┌${'─'.repeat(70)}┐${colors.reset}`);
    console.log(code);
    console.log(`${colors.dim}└${'─'.repeat(70)}┘${colors.reset}\n`);
  },

  /**
   * Print JSON data formatted
   */
  json(data: unknown, label?: string): void {
    if (label) {
      console.log(`${colors.magenta}${label}:${colors.reset}`);
    }
    console.log(JSON.stringify(data, null, 2));
  },

  /**
   * Stream text character by character (for streaming demos)
   */
  stream(text: string): void {
    process.stdout.write(text);
  },

  /**
   * Print a step in a process
   */
  step(number: number, description: string): void {
    console.log(`${colors.cyan}${colors.bold}[${number}]${colors.reset} ${description}`);
  },

  /**
   * Print a list item
   */
  item(text: string, bullet = '•'): void {
    console.log(`  ${colors.dim}${bullet}${colors.reset} ${text}`);
  },

  /**
   * Print a table row
   */
  row(columns: string[], widths: number[]): void {
    const formatted = columns.map((col, i) =>
      col.padEnd(widths[i] || 20)
    ).join(' │ ');
    console.log(`│ ${formatted} │`);
  },

  /**
   * Clear the current line (for progress updates)
   */
  clearLine(): void {
    process.stdout.write('\r\x1b[K');
  },

  /**
   * Print a progress indicator
   */
  progress(current: number, total: number, label = 'Progress'): void {
    const percent = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
    this.clearLine();
    process.stdout.write(`${label}: [${bar}] ${percent}%`);
    if (current === total) {
      console.log('');
    }
  },
};
