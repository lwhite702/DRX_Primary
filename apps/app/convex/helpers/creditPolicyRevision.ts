/** Missing revisions identify customer policies created before version tracking. */
export function readCreditPolicyRevision(value: number | undefined): number {
  const revision = value === undefined ? 0 : value;
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("INVALID_STATE: Credit policy revision requires reconciliation");
  return revision;
}
export function nextCreditPolicyRevision(value: number | undefined): number {
  const next = readCreditPolicyRevision(value) + 1;
  if (!Number.isSafeInteger(next)) throw new Error("INVALID_STATE: Credit policy revision exceeds supported range");
  return next;
}
