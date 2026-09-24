export interface SchedulerLog { business_id: string; customer_id: string; status: "success" | "failure" | "fallback"; old_recommended: number; new_recommended: number; risk_score: number; error_message?: string; timestamp: string; }
export async function refreshAllCustomerLimits(_business_id: string): Promise<{ processed: number; successful: number; failed: number; logs: SchedulerLog[] }> { return { processed: 0, successful: 0, failed: 0, logs: [] }; }
export async function scheduleNightlyRefresh(): Promise<void> { return; }
export async function manualRefreshCustomerLimit(_customer_id: string, _business_id: string) { return { success: false, message: "Credit recommendations use the canonical Convex workflow" }; }
