import { NextRequest, NextResponse } from "next/server";
import {
  auth,
  clerkClient,
  isAuthBypassEnabled,
} from "@/lib/adapters/auth/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import {
  getManualScreenPrivacyPreference,
  setManualScreenPrivacyPreference,
} from "@/lib/privacy/privacy-resolution";

type ScreenPrivacyMetadata = {
  manual_enabled?: boolean;
};

function extractScreenPrivacyPreference(metadata: unknown): ScreenPrivacyMetadata {
  const root = metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {};
  const operatorProfile =
    root.operatorProfile && typeof root.operatorProfile === "object"
      ? (root.operatorProfile as Record<string, unknown>)
      : {};
  const screenPrivacy =
    operatorProfile.screenPrivacy && typeof operatorProfile.screenPrivacy === "object"
      ? (operatorProfile.screenPrivacy as Record<string, unknown>)
      : {};

  return {
    manual_enabled:
      typeof screenPrivacy.manual_enabled === "boolean"
        ? screenPrivacy.manual_enabled
        : typeof screenPrivacy.manualEnabled === "boolean"
          ? screenPrivacy.manualEnabled
          : false,
  };
}

function getClaimsMetadata(sessionClaims: unknown) {
  return typeof (sessionClaims as Record<string, unknown> | null)?.publicMetadata === "object" &&
    (sessionClaims as Record<string, unknown> | null)?.publicMetadata !== null
    ? ((sessionClaims as Record<string, unknown>).publicMetadata as Record<string, unknown>)
    : {};
}

async function getManualPreferenceFromClaims(sessionClaims: unknown) {
  if (isAuthBypassEnabled()) {
    const fallback = extractScreenPrivacyPreference(
      (sessionClaims as { publicMetadata?: unknown } | null)?.publicMetadata ?? {},
    );
    return !!fallback.manual_enabled;
  }

  const current = extractScreenPrivacyPreference(getClaimsMetadata(sessionClaims));
  return !!current.manual_enabled;
}

async function mirrorPreferenceToClerk(userId: string, manualEnabled: boolean, sessionClaims: unknown) {
  if (isAuthBypassEnabled()) {
    return;
  }

  try {
    const client = await clerkClient();
    const publicMetadata = getClaimsMetadata(sessionClaims);
    const operatorProfile =
      (publicMetadata.operatorProfile as Record<string, unknown> | undefined) ?? {};
    const screenPrivacy =
      (operatorProfile.screenPrivacy as Record<string, unknown> | undefined) ?? {};

    await client.users.updateUser(userId, {
      publicMetadata: {
        ...publicMetadata,
        operatorProfile: {
          ...operatorProfile,
          screenPrivacy: {
            ...screenPrivacy,
            manual_enabled: manualEnabled,
          },
        },
      },
    });
  } catch (error) {
    console.warn("[privacy/protexion/preferences] failed to mirror to Clerk", error);
  }
}

export async function GET() {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { businessId } = await resolveAuthContext();
  if (!businessId) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  try {
    const dbPreference = await getManualScreenPrivacyPreference({ businessId, userId });
    if (dbPreference) {
      return NextResponse.json({ manual_enabled: !!dbPreference.manual_enabled });
    }

    const clerkValue = await getManualPreferenceFromClaims(sessionClaims);
    return NextResponse.json({ manual_enabled: clerkValue });
  } catch (error) {
    console.error("[privacy/protexion/preferences][GET]", error);
    return NextResponse.json(
      { error: "Failed to load preferences" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { businessId } = await resolveAuthContext();
  if (!businessId) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const manualEnabled = !!body?.manual_enabled;

  try {
    const persisted = await setManualScreenPrivacyPreference({
      businessId,
      userId,
      manualEnabled,
    });

    if (!persisted) {
      const fallback = await getManualPreferenceFromClaims(sessionClaims);
      if (typeof body?.manual_enabled !== "boolean") {
        return NextResponse.json({ manual_enabled: fallback });
      }
    }

    await mirrorPreferenceToClerk(userId, manualEnabled, sessionClaims);

    return NextResponse.json({ manual_enabled: manualEnabled });
  } catch (error) {
    console.error("[privacy/protexion/preferences][POST]", error);
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 },
    );
  }
}
