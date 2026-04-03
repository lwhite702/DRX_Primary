export type DashboardViewPreset = "operations" | "checkout" | "inventory";

export type PinnedPanelItemId =
  | "quick-sale"
  | "sales"
  | "inventory"
  | "customers"
  | "credit"
  | "reports"
  | "insights"
  | "help"
  | "settings";

export interface DashboardPreferences {
  preset: DashboardViewPreset;
  pinnedItemIds: PinnedPanelItemId[];
  updatedAt?: string;
  version?: 1;
}

export const DASHBOARD_PREFS_VERSION = 1 as const;
export const DASHBOARD_PREFS_LOCAL_STORAGE_KEY = "drx_dashboard_preferences_v1";
export const DASHBOARD_SNAPSHOT_COLLAPSED_KEY = "drx_dashboard_snapshot_collapsed";

export const dashboardPresetLabels: Record<DashboardViewPreset, string> = {
  operations: "Operations",
  checkout: "Checkout",
  inventory: "Inventory",
};

export const ALL_PINNED_ITEM_IDS: PinnedPanelItemId[] = [
  "quick-sale",
  "sales",
  "inventory",
  "customers",
  "credit",
  "reports",
  "insights",
  "help",
  "settings",
];

export function getDefaultPinnedItemsForPreset(
  preset: DashboardViewPreset,
): PinnedPanelItemId[] {
  switch (preset) {
    case "checkout":
      return ["quick-sale", "sales", "customers", "credit", "inventory", "help"];
    case "inventory":
      return ["inventory", "reports", "insights", "quick-sale", "settings", "help"];
    case "operations":
    default:
      return ["quick-sale", "inventory", "customers", "credit", "reports", "help"];
  }
}

export function getDefaultDashboardPreferences(
  preset: DashboardViewPreset = "operations",
): DashboardPreferences {
  return {
    preset,
    pinnedItemIds: getDefaultPinnedItemsForPreset(preset),
    version: DASHBOARD_PREFS_VERSION,
    updatedAt: new Date().toISOString(),
  };
}

function isPreset(value: unknown): value is DashboardViewPreset {
  return value === "operations" || value === "checkout" || value === "inventory";
}

function isPinnedItemId(value: unknown): value is PinnedPanelItemId {
  return typeof value === "string" && (ALL_PINNED_ITEM_IDS as string[]).includes(value);
}

export function normalizePinnedItems(
  items: unknown,
  preset: DashboardViewPreset,
): PinnedPanelItemId[] {
  const input = Array.isArray(items) ? items.filter(isPinnedItemId) : [];
  const deduped: PinnedPanelItemId[] = [];

  for (const item of input) {
    if (!deduped.includes(item)) {
      deduped.push(item);
    }
    if (deduped.length >= 6) break;
  }

  if (deduped.length === 0) {
    return getDefaultPinnedItemsForPreset(preset);
  }

  return deduped;
}

export function normalizeDashboardPreferences(input: unknown): DashboardPreferences {
  const maybe = (input && typeof input === "object" ? input : {}) as {
    preset?: unknown;
    pinnedItemIds?: unknown;
    updatedAt?: unknown;
    version?: unknown;
  };

  const preset = isPreset(maybe.preset) ? maybe.preset : "operations";
  const pinnedItemIds = normalizePinnedItems(maybe.pinnedItemIds, preset);

  return {
    preset,
    pinnedItemIds,
    version: DASHBOARD_PREFS_VERSION,
    updatedAt: typeof maybe.updatedAt === "string" ? maybe.updatedAt : undefined,
  };
}

export function extractDashboardPreferencesFromMetadata(
  metadata: unknown,
): DashboardPreferences {
  const root = (metadata && typeof metadata === "object" ? metadata : {}) as {
    operatorProfile?: { dashboardPreferences?: unknown };
    dashboardPreferences?: unknown;
  };

  // Support both the desired nested shape and a temporary flat fallback.
  return normalizeDashboardPreferences(
    root.operatorProfile?.dashboardPreferences ?? root.dashboardPreferences,
  );
}

export function mergeDashboardPreferences(
  current: DashboardPreferences,
  patch: Partial<Pick<DashboardPreferences, "preset" | "pinnedItemIds">>,
): DashboardPreferences {
  const nextPreset = patch.preset && isPreset(patch.preset) ? patch.preset : current.preset;
  const nextPinned =
    patch.pinnedItemIds !== undefined
      ? normalizePinnedItems(patch.pinnedItemIds, nextPreset)
      : current.pinnedItemIds;

  return {
    preset: nextPreset,
    pinnedItemIds: nextPinned,
    version: DASHBOARD_PREFS_VERSION,
    updatedAt: new Date().toISOString(),
  };
}

