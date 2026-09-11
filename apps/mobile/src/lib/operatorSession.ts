export type OperatorSession = {
  operatorId: string; displayName: string; businessId: string; businessName: string;
  roles: string[]; permissions: string[]; email: string | null; legacyBusinessId?: string;
};
export function selectOperatorSession(input: { userId: string | null | undefined; isSignedIn: boolean | undefined; liveSession: OperatorSession | null; cachedSession: OperatorSession | null; hasLiveStatus: boolean }): OperatorSession | null {
  if (!input.isSignedIn || !input.userId) return null;
  if (input.liveSession?.operatorId === input.userId) return input.liveSession;
  if (input.hasLiveStatus) return null;
  return input.cachedSession?.operatorId === input.userId ? input.cachedSession : null;
}
