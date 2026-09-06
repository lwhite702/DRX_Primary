import { v } from "convex/values";
export const dashboardPreset = v.union(v.literal("operations"), v.literal("checkout"), v.literal("inventory"));
export const dashboardPreferences = v.object({ preset: dashboardPreset, pinnedItemIds: v.array(v.string()), version: v.literal(1), updatedAt: v.optional(v.string()) });
