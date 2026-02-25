/**
 * Client Instrumentation
 */

import { initClientErrorInstrumentation } from "@/lib/adapters/errors-client";

initClientErrorInstrumentation();

export const onRouterTransitionStart = () => {};
