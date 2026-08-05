import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "FEATURE_DISABLED"
  | "INTERNAL_ERROR";

export function successResponse<T extends Record<string, unknown>>(
  payload: T,
  status = 200,
) {
  return NextResponse.json(payload, { status });
}

export function errorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown,
) {
  void code;
  const isDev = process.env.NODE_ENV === "development";
  return NextResponse.json(
    {
      error: message,
      ...(details !== undefined && isDev ? { details } : {}),
    },
    { status },
  );
}
