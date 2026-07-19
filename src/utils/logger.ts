/**
 * Colorful, structured console logging for the course demos. ANSI colors only,
 * so it works in any terminal without a dependency.
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

export const logger = {
  section(title: string): void {
    const line = '═'.repeat(Math.max(60, title.length + 4));
    console.log(`\n${colors.cyan}${colors.bold}${line}${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}  ${title}${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}${line}${colors.reset}\n`);
  },

  subsection(title: string): void {
    console.log(`\n${colors.blue}${colors.bold}▶ ${title}${colors.reset}\n`);
  },

  info(message: string, category?: string): void {
    const prefix = category
      ? `${colors.gray}[${category}]${colors.reset} `
      : '';
    console.log(`${prefix}${colors.green}ℹ${colors.reset} ${message}`);
  },

  warn(message: string, category?: string): void {
    const prefix = category
      ? `${colors.gray}[${category}]${colors.reset} `
      : '';
    console.log(`${prefix}${colors.yellow}⚠${colors.reset} ${colors.yellow}${message}${colors.reset}`);
  },

  error(message: string, category?: string): void {
    const prefix = category
      ? `${colors.gray}[${category}]${colors.reset} `
      : '';
    console.log(`${prefix}${colors.red}✖${colors.reset} ${colors.red}${message}${colors.reset}`);
  },

  success(message: string, category?: string): void {
    const prefix = category
      ? `${colors.gray}[${category}]${colors.reset} `
      : '';
    console.log(`${prefix}${colors.green}✔${colors.reset} ${colors.green}${message}${colors.reset}`);
  },

  debug(message: string): void {
    console.log(`${colors.dim}${message}${colors.reset}`);
  },

  code(code: string, language?: string): void {
    const lang = language ? `${colors.gray}${language}${colors.reset}\n` : '';
    console.log(`${lang}${colors.dim}┌${'─'.repeat(70)}┐${colors.reset}`);
    console.log(code);
    console.log(`${colors.dim}└${'─'.repeat(70)}┘${colors.reset}\n`);
  },

  json(data: unknown, label?: string): void {
    if (label) {
      console.log(`${colors.magenta}${label}:${colors.reset}`);
    }
    console.log(JSON.stringify(data, null, 2));
  },

  // Writes without a newline, so streaming demos print token by token.
  stream(text: string): void {
    process.stdout.write(text);
  },

  step(number: number, description: string): void {
    console.log(`${colors.cyan}${colors.bold}[${number}]${colors.reset} ${description}`);
  },

  item(text: string, bullet = '•'): void {
    console.log(`  ${colors.dim}${bullet}${colors.reset} ${text}`);
  },

  row(columns: string[], widths: number[]): void {
    const formatted = columns.map((col, i) =>
      col.padEnd(widths[i] || 20)
    ).join(' │ ');
    console.log(`│ ${formatted} │`);
  },

  // Carriage-return + clear, so progress() can overwrite its own line in place.
  clearLine(): void {
    process.stdout.write('\r\x1b[K');
  },

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
