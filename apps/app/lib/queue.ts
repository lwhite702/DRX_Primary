import { initJobs, emit } from "@wrelik/jobs";

// Initialize wrelik jobs client with the app ID
initJobs("deelrx" as any);

export { emit };
