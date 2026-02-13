import { auth } from '@clerk/nextjs';
import { fromClerkAuth, type WorkflowSession } from './index';

export function getSession(): WorkflowSession {
  const clerkAuth = auth();
  return fromClerkAuth(clerkAuth);
}
