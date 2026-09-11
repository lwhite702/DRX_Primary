import { expect, it } from "vitest";
import { selectOperatorSession, type OperatorSession } from "../../../mobile/src/lib/operatorSession";
const cached: OperatorSession = { operatorId: "operator", displayName: "Synthetic", businessId: "old-business", businessName: "Old", roles: ["staff"], permissions: [], email: null, legacyBusinessId: "old-mapping" };
it("does not merge a cached business mapping into a different live business", () => {
  const live = { ...cached, businessId: "new-business", legacyBusinessId: undefined };
  expect(selectOperatorSession({ userId: "operator", isSignedIn: true, liveSession: live, cachedSession: cached, hasLiveStatus: true })).toBe(live);
});
it("permits the same operator's offline cache only while canonical status is unavailable", () => {
  const input = { userId: "operator", isSignedIn: true, liveSession: null, cachedSession: cached, hasLiveStatus: false };
  expect(selectOperatorSession(input)).toBe(cached);
  expect(selectOperatorSession({ ...input, hasLiveStatus: true })).toBeNull();
  expect(selectOperatorSession({ ...input, userId: "other" })).toBeNull();
  expect(selectOperatorSession({ ...input, isSignedIn: false })).toBeNull();
});
