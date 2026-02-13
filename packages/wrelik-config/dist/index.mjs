import {
  clientSchema,
  commonSchema
} from "./chunk-DKD5KYQQ.mjs";

// src/index.ts
import { z } from "zod";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
function createEnv(schema) {
  const envSchema = z.object({ ...commonSchema, ...schema });
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("\u274C Invalid environment variables:", result.error.format());
    throw new Error("Invalid environment variables");
  }
  return result.data;
}
function loadServerConfig() {
  return createEnv({});
}
export {
  clientSchema,
  commonSchema,
  createEnv,
  loadServerConfig
};
