import { SignedInAuthObject, SignedOutAuthObject } from '@clerk/backend';
import { W as WorkflowSession } from './shared-BYrhBbPS.js';
export { h as hasRole, b as requireRole, a as requireTenant, r as requireUser } from './shared-BYrhBbPS.js';

declare function fromClerkAuth(auth: SignedInAuthObject | SignedOutAuthObject | null): WorkflowSession;

export { WorkflowSession, fromClerkAuth };
