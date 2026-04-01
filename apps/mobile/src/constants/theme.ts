export const COLORS = {
  // Backgrounds - Dark Industrial
  background: "#0a0a0a",
  surface: "#0c0c0c",
  surfaceLight: "#1E1E1E",
  surfaceLighter: "#2A2A2A",

  // Accent - Neon Lime
  accent: "#ccff00",
  accentDim: "#a3cc00",
  accentGlow: "rgba(204, 255, 0, 0.15)",

  // Text
  text: "#f5f5f5",
  textSecondary: "#9ca3af",
  textMuted: "#525252",

  // Status
  success: "#10b981",
  successDim: "#059669",
  warning: "#f59e0b",
  warningDim: "#d97706",
  error: "#ef4444",
  errorDim: "#dc2626",

  // Loyalty Tiers
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",

  // Borders
  border: "#2A2A2A",
  borderLight: "#3A3A3A",
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 48,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 999,
};

// Bulk pricing tiers for cannabis
export const WEIGHT_TIERS = [
  { label: "1g", grams: 1 },
  { label: "3.5g", grams: 3.5 },
  { label: "7g", grams: 7 },
  { label: "14g", grams: 14 },
  { label: "28g", grams: 28 },
];

// Loyalty tier discounts
export const LOYALTY_DISCOUNTS = {
  bronze: 0,
  silver: 0.05, // 5%
  gold: 0.1, // 10%
};
