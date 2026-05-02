// Structured Logger for Supabase Edge Functions
// This logger provides consistent, structured logging with proper context and severity levels

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogContext {
  functionName?: string;
  userId?: string;
  restaurantId?: string;
  requestId?: string;
  action?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private context: LogContext = {};
  private minLevel: LogLevel = LogLevel.INFO;

  constructor(functionName: string) {
    this.context.functionName = functionName;
    // In development, log DEBUG; in production, log INFO only
    this.minLevel = Deno.env.get('ENVIRONMENT') === 'development' 
      ? LogLevel.DEBUG 
      : LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const minIndex = levels.indexOf(this.minLevel);
    const levelIndex = levels.indexOf(level);
    return levelIndex >= minIndex;
  }

  private formatLogEntry(entry: LogEntry): string {
    const contextStr = entry.context && Object.keys(entry.context).length > 0
      ? ` | ${JSON.stringify(entry.context)}`
      : '';
    
    let output = `[${entry.timestamp}] [${entry.level}] ${entry.message}${contextStr}`;
    
    if (entry.error) {
      output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\n  Stack: ${entry.error.stack}`;
      }
    }
    
    return output;
  }

  private log(level: LogLevel, message: string, contextOrError?: LogContext | Error, errorData?: LogContext) {
    if (!this.shouldLog(level)) return;

    let context = { ...this.context };
    let error: LogEntry['error'] | undefined;

    if (contextOrError instanceof Error) {
      error = {
        name: contextOrError.name,
        message: contextOrError.message,
        stack: contextOrError.stack,
      };
      if (errorData) context = { ...context, ...errorData };
    } else if (contextOrError) {
      context = { ...context, ...contextOrError };
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: Object.keys(context).length > 0 ? context : undefined,
      error,
    };

    const formattedLog = this.formatLogEntry(entry);
    
    // Output to console for Supabase to capture
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedLog);
        break;
      case LogLevel.WARN:
        console.warn(formattedLog);
        break;
      case LogLevel.DEBUG:
      case LogLevel.INFO:
      default:
        console.log(formattedLog);
    }
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    this.log(LogLevel.ERROR, message, error, context);
  }

  withContext(contextData: LogContext): Logger {
    const newLogger = new Logger(this.context.functionName || 'unknown');
    newLogger.context = { ...this.context, ...contextData };
    newLogger.minLevel = this.minLevel;
    return newLogger;
  }
}

export function createLogger(functionName: string): Logger {
  return new Logger(functionName);
}

// Export for convenience
export default Logger;
