import {
  initJobs,
  emit,
  createFunction,
  inngest,
} from "@/lib/adapters/jobs";

// Initialize wrelik jobs client with the app ID
initJobs({ appId: "deelrx" });

export { emit, createFunction, inngest };
