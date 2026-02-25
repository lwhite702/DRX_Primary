// Temporary compatibility shim until published @wrelik/auth exports ./shared.
export { hasRole, requireRole, requireTenant, requireUser } from "@wrelik/auth";
export type { WorkflowSession } from "@wrelik/auth";
