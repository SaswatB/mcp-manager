import { BehaviorSubject } from "rxjs";
import { app } from "electron";
import path from "path";
import fs from "fs";

// Log entry type
export interface LogEntry {
  timestamp: string;
  level: "INFO" | "DEBUG" | "WARN" | "ERROR";
  message: string;
}

// Maximum number of log entries to keep in memory
const MAX_LOG_ENTRIES = 1000;

// Log levels
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Create log directory if it doesn't exist
const LOG_DIR = path.join(app.getPath("userData"), "logs");
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Log file path (daily rotation)
const getLogFilePath = () => {
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return path.join(LOG_DIR, `mcp-manager-${date}.log`);
};

export class Logger {
  private logs$ = new BehaviorSubject<LogEntry[]>([]);
  private logLevel: string = "info";
  private logListeners: Array<(entry: LogEntry) => void> = [];

  constructor() {
    // Override console methods to capture logs
    const originalConsoleLog = console.log;
    const originalConsoleInfo = console.info;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    const originalConsoleDebug = console.debug;

    console.log = (...args) => {
      originalConsoleLog(...args);
      this.info(args.join(" "));
    };

    console.info = (...args) => {
      originalConsoleInfo(...args);
      this.info(args.join(" "));
    };

    console.warn = (...args) => {
      originalConsoleWarn(...args);
      this.warn(args.join(" "));
    };

    console.error = (...args) => {
      originalConsoleError(...args);
      this.error(args.join(" "));
    };

    console.debug = (...args) => {
      originalConsoleDebug(...args);
      this.debug(args.join(" "));
    };
  }

  // Set the log level
  setLogLevel(level: string): void {
    if (level in LOG_LEVELS) {
      this.logLevel = level;
    }
  }

  // Add a log listener
  addLogListener(listener: (entry: LogEntry) => void): void {
    this.logListeners.push(listener);
  }

  // Remove a log listener
  removeLogListener(listener: (entry: LogEntry) => void): void {
    const index = this.logListeners.indexOf(listener);
    if (index !== -1) {
      this.logListeners.splice(index, 1);
    }
  }

  // Get all logs
  getLogs(): LogEntry[] {
    return this.logs$.getValue();
  }

  // Clear logs
  clearLogs(): void {
    this.logs$.next([]);
  }

  // Private method to add a log entry
  private addLogEntry(
    level: "INFO" | "DEBUG" | "WARN" | "ERROR",
    message: string
  ): void {
    // Check if we should log this level
    if (
      LOG_LEVELS[this.logLevel.toLowerCase()] > LOG_LEVELS[level.toLowerCase()]
    ) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    // Add to in-memory logs
    const currentLogs = this.logs$.getValue();
    const newLogs = [entry, ...currentLogs].slice(0, MAX_LOG_ENTRIES);
    this.logs$.next(newLogs);

    // Write to file
    fs.appendFileSync(
      getLogFilePath(),
      `${entry.timestamp} [${entry.level}] ${entry.message}\n`
    );

    // Notify listeners
    this.logListeners.forEach((listener) => listener(entry));
  }

  // Public logging methods
  debug(message: string): void {
    this.addLogEntry("DEBUG", message);
  }

  info(message: string): void {
    this.addLogEntry("INFO", message);
  }

  warn(message: string): void {
    this.addLogEntry("WARN", message);
  }

  error(message: string): void {
    this.addLogEntry("ERROR", message);
  }
}

// Create a singleton logger instance
export const logger = new Logger();
