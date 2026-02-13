import { SignedInAuthObject, SignedOutAuthObject } from '@clerk/backend';
import { W as WorkflowSession } from './shared-Z5LN5APr.js';
export { h as hasRole, r as requireRole, a as requireTenant, b as requireUser } from './shared-Z5LN5APr.js';

declare function fromClerkAuth(auth: SignedInAuthObject | SignedOutAuthObject | null): WorkflowSession;

export { WorkflowSession, fromClerkAuth };
