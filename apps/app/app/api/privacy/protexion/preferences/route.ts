import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient, isAuthBypassEnabled } from "@/lib/adapters/auth/server";

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

export async function GET() {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isAuthBypassEnabled()) {
    const fallback = extractScreenPrivacyPreference(
      (sessionClaims as { publicMetadata?: unknown } | null)?.publicMetadata ?? {},
    );
    return NextResponse.json({ manual_enabled: !!fallback.manual_enabled });
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const current = extractScreenPrivacyPreference(user.publicMetadata);
    return NextResponse.json({ manual_enabled: !!current.manual_enabled });
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

  const body = await request.json().catch(() => ({}));
  const manualEnabled = !!body?.manual_enabled;

  if (isAuthBypassEnabled()) {
    const fallback = extractScreenPrivacyPreference(
      (sessionClaims as { publicMetadata?: unknown } | null)?.publicMetadata ?? {},
    );
    return NextResponse.json({
      manual_enabled:
        typeof body?.manual_enabled === "boolean"
          ? manualEnabled
          : !!fallback.manual_enabled,
    });
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const publicMetadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
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

    return NextResponse.json({ manual_enabled: manualEnabled });
  } catch (error) {
    console.error("[privacy/protexion/preferences][POST]", error);
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 },
    );
  }
}
