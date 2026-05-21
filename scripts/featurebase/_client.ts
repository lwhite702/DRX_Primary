import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

export const FEATUREBASE_API_BASE = process.env.FEATUREBASE_API_BASE ?? "https://do.featurebase.app/v2";
export const FEATUREBASE_VERSION = process.env.FEATUREBASE_VERSION ?? "2026-01-01.nova";
export const FEATUREBASE_API_KEY = process.env.FEATUREBASE_API_KEY;

export type FbList<T> = { object: "list"; data: T[]; nextCursor: string | null };

export function requireApiKey(): string {
  if (!FEATUREBASE_API_KEY) {
    throw new Error("Missing FEATUREBASE_API_KEY in environment.");
  }
  return FEATUREBASE_API_KEY;
}

export async function fbRequest<T>(
  method: string,
  endpoint: string,
  body?: unknown,
): Promise<T> {
  const apiKey = requireApiKey();
  const res = await fetch(`${FEATUREBASE_API_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Featurebase-Version": FEATUREBASE_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    throw new Error(`Featurebase ${method} ${endpoint} failed (${res.status}): ${text}`);
  }
  return json as T;
}

export function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeText(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

