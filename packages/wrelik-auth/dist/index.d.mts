import { SignedInAuthObject, SignedOutAuthObject } from '@clerk/backend';
import { W as WorkflowSession } from './shared-BYrhBbPS.mjs';
export { h as hasRole, b as requireRole, a as requireTenant, r as requireUser } from './shared-BYrhBbPS.mjs';

declare function fromClerkAuth(auth: SignedInAuthObject | SignedOutAuthObject | null): WorkflowSession;

export { WorkflowSession, fromClerkAuth };
