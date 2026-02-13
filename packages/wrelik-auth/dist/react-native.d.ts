import { W as WorkflowSession } from './shared-Z5LN5APr.js';
export { h as hasRole, r as requireRole, a as requireTenant, b as requireUser } from './shared-Z5LN5APr.js';

declare function mapClerkToSession(auth: {
    userId?: string | null;
    orgId?: string | null;
    session?: {
        user?: {
            publicMetadata?: any;
        };
    };
} | null): WorkflowSession;

export { WorkflowSession, mapClerkToSession };
