/**
 * Logging utility for the application
 * Provides consistent error/warn/info logging across the app
 */

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
}

const isDevelopment = import.meta.env.DEV;
const logs: LogEntry[] = [];
const MAX_LOGS = 100; // Keep last 100 logs in memory

const log = (level: LogLevel, message: string, context?: Record<string, any>, error?: Error) => {
  const timestamp = new Date().toISOString();
  const entry: LogEntry = { level, message, timestamp, context, error };

  // Store in memory (latest 100)
  logs.push(entry);
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }

  // Log to console in development
  if (isDevelopment) {
    const logFunc = level === LogLevel.ERROR ? console.error : level === LogLevel.WARN ? console.warn : console.log;
    logFunc(`[${timestamp}] ${level}: ${message}`, context || '', error || '');
  }

  // In production, you could send to a logging service (Sentry, LogRocket, etc.)
  // Example: if (!isDevelopment) sendToLogService(entry);
};

export const logger = {
  info: (message: string, context?: Record<string, any>) => log(LogLevel.INFO, message, context),
  warn: (message: string, context?: Record<string, any>) => log(LogLevel.WARN, message, context),
  error: (message: string, context?: Record<string, any>, error?: Error) => log(LogLevel.ERROR, message, context, error),
  debug: (message: string, context?: Record<string, any>) => {
    if (isDevelopment) {
      log(LogLevel.DEBUG, message, context);
    }
  },
  getLogs: () => [...logs],
  clearLogs: () => logs.splice(0),
};

export default logger;
