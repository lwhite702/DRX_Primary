import { W as WorkflowSession } from './shared-BYrhBbPS.mjs';
export { h as hasRole, b as requireRole, a as requireTenant, r as requireUser } from './shared-BYrhBbPS.mjs';

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
