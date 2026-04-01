import {
  clientSchema,
  commonSchema
} from "./chunk-DKD5KYQQ.mjs";

// src/react-native.ts
import { z } from "zod";
function loadClientConfig(extraSchema = {}, env = process.env) {
  const mergedSchema = z.object({
    ...commonSchema,
    ...clientSchema,
    ...extraSchema
  });
  const result = mergedSchema.safeParse(env);
  if (!result.success) {
    console.error("\u274C Invalid client environment variables:", result.error.format());
    throw new Error("Invalid client environment variables");
  }
  return result.data;
}
export {
  clientSchema,
  commonSchema,
  loadClientConfig
};
