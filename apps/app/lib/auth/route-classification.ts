const PUBLIC_APP_PREFIXES = [
  "/waitlist",
  "/login",
  "/register",
  "/sign-in",
  "/sign-up",
  "/sso-callback",
  "/_next",
  "/api/public",
  "/api/webhooks",
  "/api/uploadthing",
  "/brand",
] as const;

const PUBLIC_APP_EXACT = new Set(["/privacy", "/terms"]);
const AUTH_ENTRY_PREFIXES = ["/login", "/register", "/sign-in", "/sign-up", "/sso-callback"] as const;
const CLERK_UI_PREFIXES = [...AUTH_ENTRY_PREFIXES, "/onboarding"] as const;
const OPERATOR_MARKETING_REDIRECT_PREFIXES = [
  "/dashboard",
  "/inventory",
  "/sales",
  "/customers",
  "/pos",
  "/reports",
  "/settings",
  "/admin",
  "/login",
  "/register",
  "/sign-in",
  "/sign-up",
] as const;

const STATIC_ASSET_RE =
  /\/[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)$/i;

export type DrxHostKind = "marketing" | "app" | "auth" | "other";

export function normalizePathname(pathname: string) {
  if (!pathname) return "/";
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function matchesPrefix(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isStaticAssetPath(pathname: string) {
  return STATIC_ASSET_RE.test(normalizePathname(pathname));
}

export function isApiPath(pathname: string) {
  return normalizePathname(pathname).startsWith("/api/");
}

export function isPublicAppPath(pathname: string) {
  const normalized = normalizePathname(pathname);
  if (PUBLIC_APP_EXACT.has(normalized)) return true;
  if (matchesPrefix(normalized, PUBLIC_APP_PREFIXES)) return true;
  return isStaticAssetPath(normalized);
}

export function isAuthEntryPath(pathname: string) {
  return matchesPrefix(normalizePathname(pathname), AUTH_ENTRY_PREFIXES);
}

export function isClerkUiPath(pathname: string) {
  return matchesPrefix(normalizePathname(pathname), CLERK_UI_PREFIXES);
}

export function isOnboardingPath(pathname: string) {
  return matchesPrefix(normalizePathname(pathname), ["/onboarding"]);
}

export function shouldRedirectMarketingToApp(pathname: string) {
  return matchesPrefix(normalizePathname(pathname), OPERATOR_MARKETING_REDIRECT_PREFIXES);
}

export function classifyDrxHost(hostname: string | null | undefined): DrxHostKind {
  const host = (hostname ?? "").toLowerCase();
  if (!host) return "other";
  if (
    host === "deelrxcrm.com" ||
    host.endsWith(".deelrxcrm.com") ||
    host === "deelrx.com" ||
    host.endsWith(".deelrx.com")
  ) {
    return "marketing";
  }
  if (
    host === "accounts.deelrxcrm.app" ||
    host.endsWith(".accounts.deelrxcrm.app") ||
    host === "accounts.deelrx.app" ||
    host.endsWith(".accounts.deelrx.app")
  ) {
    return "auth";
  }
  if (
    host === "deelrxcrm.app" ||
    host.endsWith(".deelrxcrm.app") ||
    host === "deelrx.app" ||
    host.endsWith(".deelrx.app") ||
    host.includes("localhost")
  ) {
    return "app";
  }
  return "other";
}

export function isProtectedAppPath(pathname: string) {
  const normalized = normalizePathname(pathname);
  return !isPublicAppPath(normalized) && !isApiPath(normalized);
}

