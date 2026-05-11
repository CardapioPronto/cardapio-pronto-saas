import { captureException } from "./observability";

// Logger leve: silencia debug/info em produção e encaminha erros à observabilidade.
// Use `createLogger("scope")` em hooks/serviços para rastrear a origem.

type LogLevel = "debug" | "info" | "warn" | "error";

const isDev = import.meta.env.DEV;

function emit(level: LogLevel, scope: string, args: unknown[]): void {
  if (!isDev && (level === "debug" || level === "info")) return;

  const prefix = scope ? `[${scope}]` : "";
  const payload = prefix ? [prefix, ...args] : args;

  const sink = console[level === "debug" || level === "info" ? "log" : level];
  sink(...payload);
}

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  capture: (error: unknown, context?: Record<string, unknown>) => void;
}

export function createLogger(scope: string): Logger {
  return {
    debug: (...args) => emit("debug", scope, args),
    info: (...args) => emit("info", scope, args),
    warn: (...args) => emit("warn", scope, args),
    error: (...args) => emit("error", scope, args),
    capture: (error, context) => {
      emit("error", scope, [error, context]);
      captureException(error, { scope, ...(context ?? {}) });
    },
  };
}

export const logger: Logger = createLogger("");
