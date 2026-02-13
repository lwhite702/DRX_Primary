import { z } from 'zod';
export { c as clientSchema, a as commonSchema } from './shared-D4fnBEvF.js';

declare function createEnv<T extends z.ZodRawShape>(schema: T): z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    NODE_ENV: z.ZodOptional<z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>>;
} & T>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never;
declare function loadServerConfig(): {
    NODE_ENV?: "development" | "test" | "production" | undefined;
};

export { createEnv, loadServerConfig };
