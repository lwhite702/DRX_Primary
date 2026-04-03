import type { PrivacyProtocolSettings, ScreenPrivacyMode } from "@/lib/privacy/types";

export function maskAlias(value: string | null | undefined): string {
  const alias = (value || "").trim();
  if (!alias) return "Hidden";

  return alias
    .split(/\s+/)
    .map((token) => `${token[0].toUpperCase()}***`)
    .join(" ");
}

export function maskSensitiveText(): string {
  return "Hidden";
}

export function shouldMaskPii(
  mode: ScreenPrivacyMode,
  manualEnabled: boolean,
  isPosContext: boolean,
): boolean {
  if (mode === "always_on") return true;
  if (mode === "pos_only") return isPosContext;
  return manualEnabled;
}

export function shouldMaskFromProtocol(
  protocol: PrivacyProtocolSettings,
  manualEnabled: boolean,
  isPosContext: boolean,
): boolean {
  return shouldMaskPii(protocol.screen_privacy.mode, manualEnabled, isPosContext);
}
