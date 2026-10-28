function generateUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type LogLevel = "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

function serializeError(error: unknown): Record<string, string> | string {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? "",
    };
  }

  return String(error);
}

function normalizeContext(context: LogContext): LogContext {
  const normalized: LogContext = {};

  for (const [key, value] of Object.entries(context)) {
    if (value instanceof Error) {
      normalized[key] = serializeError(value);
      continue;
    }

    normalized[key] = value;
  }

  return normalized;
}

function write(level: LogLevel, message: string, context: LogContext = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...normalizeContext(context),
  };

  const serialized = JSON.stringify(entry);
  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
}

export const logger = {
  info(message: string, context: LogContext = {}) {
    write("info", message, context);
  },
  warn(message: string, context: LogContext = {}) {
    write("warn", message, context);
  },
  error(message: string, context: LogContext = {}) {
    write("error", message, context);
  },
};

export function getRequestId(headers?: Headers): string {
  const headerValue = headers?.get("x-request-id")?.trim();
  return headerValue && headerValue.length > 0 ? headerValue : generateUuid();
}

