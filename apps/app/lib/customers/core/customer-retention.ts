export type CustomerLifecycleState =
  | "active"
  | "ephemeral_active"
  | "retention_pending"
  | "soft_deleted"
  | "hard_deleted"
  | "legal_hold";

export function resolveCustomerLifecycleState(args: {
  isActive: boolean;
  ephemeral: boolean;
  hasLegalHold: boolean;
  deletedAt?: string | Date | null;
}): CustomerLifecycleState {
  if (args.hasLegalHold) return "legal_hold";
  if (args.deletedAt) return args.isActive ? "soft_deleted" : "hard_deleted";
  if (args.ephemeral) return "ephemeral_active";
  return args.isActive ? "active" : "retention_pending";
}
