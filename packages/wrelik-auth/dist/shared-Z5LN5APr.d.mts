interface WorkflowSession {
    userId: string | null;
    tenantId: string | null;
    roles: string[];
}
declare function requireUser(session: WorkflowSession | null): string;
declare function requireTenant(session: WorkflowSession | null): string;
declare function hasRole(session: WorkflowSession | null, role: string): boolean;
declare function requireRole(session: WorkflowSession | null, role: string): void;

export { type WorkflowSession as W, requireTenant as a, requireUser as b, hasRole as h, requireRole as r };
