export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const levelOrder: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
};

const colors = {
  DEBUG: "\x1b[90m", // Gray
  INFO: "", // Default
  WARN: "\x1b[33m", // Orange/Yellow
  ERROR: "\x1b[31m", // Red
  RESET: "\x1b[0m", // Reset
  BOLD: "\x1b[1m", // Bold
};

function formatValue(value: unknown): string {
  let formattedValue: string;

  if (value === null) formattedValue = "null";
  else if (value === undefined) formattedValue = "undefined";
  else if (value instanceof Date) formattedValue = value.toISOString();
  else if (value instanceof Error)
    formattedValue = value.message || String(value);
  else if (typeof value === "bigint") formattedValue = value.toString();
  else if (typeof value === "object") {
    try {
      formattedValue = JSON.stringify(value);
    } catch {
      formattedValue = String(value);
    }
  } else {
    formattedValue = String(value);
  }

  return `${colors.BOLD}${formattedValue}${colors.RESET}`;
}

function colorize(level: LogLevel, text: string): string {
  return `${colors[level]}${text}${colors.RESET}`;
}

export interface LoggerOptions {
  level?: LogLevel;
}

export class Logger {
  private level: LogLevel;

  constructor(options: LoggerOptions = {}) {
    this.level =
      options.level ??
      (process.env.NODE_ENV === "production" ? "INFO" : "DEBUG");
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return levelOrder[level] >= levelOrder[this.level];
  }

  private emit(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>
  ) {
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

    const coloredLine = colorize(level, line);

    switch (level) {
      case "DEBUG":
        if (process.env.NODE_ENV !== "production") {
          console.log(coloredLine);
        }
        break;
      case "INFO":
        console.log(coloredLine);
        break;
      case "WARN":
        console.log(coloredLine);
        break;
      case "ERROR":
        console.log(coloredLine);
        break;
    }
  }

  log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    if (["DEBUG", "INFO", "WARN", "ERROR"].includes(level)) {
      this.emit(level, message, meta);
    } else {
      throw new Error(`Invalid log level: ${level}`);
    }
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
