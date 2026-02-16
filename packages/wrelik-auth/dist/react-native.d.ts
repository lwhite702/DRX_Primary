import { W as WorkflowSession } from './shared-BYrhBbPS.js';
export { h as hasRole, b as requireRole, a as requireTenant, r as requireUser } from './shared-BYrhBbPS.js';

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
