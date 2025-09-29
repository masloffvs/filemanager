export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const levelOrder: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
};

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return value.message || String(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export interface LoggerOptions {
  level?: LogLevel;
}

export class Logger {
  private level: LogLevel;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? "INFO";
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return levelOrder[level] >= levelOrder[this.level];
  }

  private emit(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    if (!this.shouldLog(level)) return;

    const time = new Date().toISOString();
    const pairs = Object.entries(meta ?? {})
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${formatValue(v)}`)
      .join(" ");

    const line = pairs
      ? `[${time}] [${level}] ${message} ${pairs}`
      : `[${time}] [${level}] ${message}`;

    switch (level) {
      case "DEBUG":
        console.debug(line);
        break;
      case "INFO":
        console.info(line);
        break;
      case "WARN":
        console.warn(line);
        break;
      case "ERROR":
        console.error(line);
        break;
    }
  }

  log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    this.emit(level, message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.emit("DEBUG", message, meta);
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.emit("INFO", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.emit("WARN", message, meta);
  }

  error(message: string, meta?: Record<string, unknown>) {
    this.emit("ERROR", message, meta);
  }
}

export const logger = new Logger();

