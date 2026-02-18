import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[90m',  // gray
  info: '\x1b[36m',   // cyan
  warn: '\x1b[33m',   // yellow
  error: '\x1b[31m',  // red
};

const RESET = '\x1b[0m';

export class Logger {
  private minLevel: LogLevel;
  private logFilePath: string | null;

  constructor(minLevel: LogLevel = 'info', logFilePath?: string) {
    this.minLevel = minLevel;
    this.logFilePath = logFilePath ?? null;

    if (this.logFilePath) {
      mkdirSync(dirname(this.logFilePath), { recursive: true });
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log('error', message, context);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.minLevel]) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context ? { context } : {}),
    };

    // Console output
    const color = LEVEL_COLORS[level];
    const prefix = `${color}[${level.toUpperCase().padEnd(5)}]${RESET}`;
    const time = `\x1b[90m${entry.timestamp}${RESET}`;
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    console.log(`${time} ${prefix} ${message}${contextStr}`);

    // File output (NDJSON)
    if (this.logFilePath) {
      try {
        appendFileSync(this.logFilePath, JSON.stringify(entry) + '\n');
      } catch {
        // Silently ignore file write errors to not disrupt migration
      }
    }
  }
}
