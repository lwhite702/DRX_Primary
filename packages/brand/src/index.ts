export const brandColors = {
  background: "#0A0A0A",
  surface: "#121212",
  surfaceElevated: "#1A1A1A",
  foreground: "#F5F5F5",
  muted: "#121212",
  mutedForeground: "#A3A3A3",
  border: "rgba(255, 255, 255, 0.1)",

  // Accents
  accent: "#CCFF00",
  accentDark: "#A3CC00",
  accentLight: "#D9FF4D",

  // Semantic
  success: "#10B981",
  warning: "#F59E0B",
  destructive: "#EF4444",
  info: "#3B82F6",
} as const;

export const brandTypography = {
  sans: "Plus Jakarta Sans",
  mono: "Geist Mono",
  body: "system-ui",
} as const;

export const brandSpacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
} as const;

export const brandRadius = {
  control: 6,
  card: 10,
  panel: 14,
} as const;

export const brandMotion = {
  fast: 150,
  standard: 180,
  deliberate: 220,
} as const;

export const brandIcons = {
  wordmark: "/brand/drx-wordmark.svg",
  mark: "/brand/drx-mark.svg",
} as const;
