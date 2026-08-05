export class ConvexAppError extends Error {
  public code: string;

  constructor(code: string, message: string) {
    super(`[${code}] ${message}`);
    this.name = "ConvexAppError";
    this.code = code;
  }
}

export function formatConvexError(error: unknown): { code: string; message: string } {
  if (error instanceof ConvexAppError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof Error) {
    const match = error.message.match(/^\[([A-Z_]+)\]\s*(.*)$/);
    if (match) {
      return { code: match[1], message: match[2] };
    }
    return { code: "INTERNAL_ERROR", message: error.message };
  }
  return { code: "UNKNOWN_ERROR", message: "An unexpected error occurred" };
}
