type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service?: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function getMinLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL;
  if (
    configured === "debug" ||
    configured === "info" ||
    configured === "warn" ||
    configured === "error"
  ) {
    return configured;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[getMinLevel()];
}

function serializeError(err: unknown): LogEntry["error"] | undefined {
  if (!err) return undefined;
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    };
  }
  return { name: "UnknownError", message: String(err) };
}

function write(entry: LogEntry): void {
  const line = JSON.stringify(entry);
  switch (entry.level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    default:
      console.log(line);
  }
}

export type Logger = {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, err?: unknown, context?: LogContext) => void;
  child: (bindings: LogContext) => Logger;
};

function createLogger(service?: string, bindings: LogContext = {}): Logger {
  const base = service ? { service, ...bindings } : bindings;

  const log =
    (level: LogLevel) =>
    (message: string, ctxOrErr?: LogContext | unknown, maybeCtx?: LogContext) => {
      if (!shouldLog(level)) return;

      let context: LogContext | undefined = { ...base };
      let error: LogEntry["error"];

      if (level === "error" && ctxOrErr !== undefined) {
        if (ctxOrErr instanceof Error || typeof ctxOrErr === "string") {
          error = serializeError(ctxOrErr);
          context = { ...context, ...maybeCtx };
        } else {
          context = { ...context, ...(ctxOrErr as LogContext) };
        }
      } else if (ctxOrErr && typeof ctxOrErr === "object") {
        context = { ...context, ...(ctxOrErr as LogContext) };
      }

      write({
        level,
        message,
        timestamp: new Date().toISOString(),
        service,
        context: Object.keys(context).length ? context : undefined,
        error,
      });
    };

  return {
    debug: (m, c) => log("debug")(m, c),
    info: (m, c) => log("info")(m, c),
    warn: (m, c) => log("warn")(m, c),
    error: (m, e, c) => log("error")(m, e, c),
    child: (childBindings) =>
      createLogger(service, { ...bindings, ...childBindings }),
  };
}

export const logger = createLogger("court-pedia");
