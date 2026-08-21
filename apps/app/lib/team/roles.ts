export const MANAGEABLE_TEAM_ROLES = [
  "cashier",
  "supervisor",
  "manager",
  "admin",
  "staff",
] as const;

export type ManageableTeamRole = (typeof MANAGEABLE_TEAM_ROLES)[number];

export function normalizeTeamRole(value: unknown): ManageableTeamRole | null {
  if (typeof value !== "string") return null;

  const role = value.trim().toLowerCase();
  return MANAGEABLE_TEAM_ROLES.includes(role as ManageableTeamRole)
    ? (role as ManageableTeamRole)
    : null;
}
