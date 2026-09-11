"use client";

import { useEffect, useRef, useState } from "react";
import { businessSettingsResponseSchema, pinUpdate } from "@/lib/business/settings-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  PackageOpen,
  Shield,
  SlidersHorizontal,
  Smartphone,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useBusiness } from "@/lib/hooks/use-business";
import { usePermission } from "@/lib/hooks/use-permission";
import { Tour } from "@/components/ui/tour";
import { AppPageSkeleton } from "@/components/skeletons/app-page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getDefaultPrivacyProtocol,
  PRIVACY_PROFILE_OPTIONS,
} from "@/lib/privacy/profiles";
import {
  PRIVACY_FIELDS,
  type PrivacyProfile,
  type PrivacyField,
  type PrivacyProtocolSettings,
  type ScreenPrivacyMode,
} from "@/lib/privacy/types";
import appPackage from "../../../package.json";

interface DeviceSession {
  id: string;
  is_current: boolean;
  last_active_at: string;
  device_type: string;
  browser: string;
  ip: string | null;
  city: string | null;
  country: string | null;
  status: string;
}

interface PrivacyInventorySnapshot {
  alias_count: number;
  phone_count: number;
  email_count: number;
  address_count: number;
  notes_count: number;
  alias_delta: number;
  phone_delta: number;
  email_delta: number;
  address_delta: number;
  notes_delta: number;
  captured_at: string;
}

interface VaultStatus {
  vault_mode_active: boolean;
  current_key_loaded: boolean;
  previous_key_loaded: boolean;
  hash_key_loaded: boolean;
  last_error_at: string | null;
}

const FIELD_LABELS: Record<PrivacyField, string> = {
  alias: "Alias",
  first_name: "First name",
  phone: "Phone",
  email: "Email",
  address: "Address",
  notes: "Notes",
};

export default function SettingsPage() {
  const router = useRouter();
  const { business, loading: businessLoading, refreshBusiness } = useBusiness();
  const { hasPermission } = usePermission(business?.id);

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");

  const [taxRate, setTaxRate] = useState("");
  const [collectTax, setCollectTax] = useState(true);
  const [posManagerPin, setPosManagerPin] = useState("");
  const [pinConfigured, setPinConfigured] = useState(false);
  const [pinDirty, setPinDirty] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsReload, setSettingsReload] = useState(0);
  const [privacySettingsEnabled, setPrivacySettingsEnabled] = useState(false);
  const [privacyRevision, setPrivacyRevision] = useState<number | null>(null);
  const activeBusinessId = useRef<string | null>(null);
  activeBusinessId.current = business?.id ?? null;

  const [privacyProtocol, setPrivacyProtocol] =
    useState<PrivacyProtocolSettings>(getDefaultPrivacyProtocol());
  const [manualScreenPrivacyEnabled, setManualScreenPrivacyEnabled] = useState(false);
  const [manualPreferenceReady, setManualPreferenceReady] = useState(false);
  const [inventorySnapshot, setInventorySnapshot] =
    useState<PrivacyInventorySnapshot | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryRefreshing, setInventoryRefreshing] = useState(false);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);

  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mobileStep, setMobileStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (business) {
      setBusinessName(business.businessName || business.business_name || "");
      setBusinessType(business.businessType || business.business_type || "");
      setPhone(business.phoneNumber || business.phone_number || "");
      setEmail(business.email || "");
      setAddress(business.address || "");
      setCity(business.city || "");
      setState(business.state || "");
      setZipCode(business.zipCode || business.zip_code || "");
    }
  }, [business]);

  useEffect(() => {
    let cancelled = false;
    setSettingsReady(false); setSettingsError(null); setPosManagerPin(""); setPinDirty(false);
    if (!business?.id) return;
    fetch("/api/business/settings", { headers: { "X-Business-Id": String(business.id) }, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Settings unavailable");
        return businessSettingsResponseSchema.parse(await response.json());
      })
      .then((data) => {
        if (cancelled) return;
        setTaxRate((data.defaultTaxRate * 100).toFixed(2)); setCollectTax(data.collectTax);
        setPinConfigured(data.posManagerPinConfigured); setPrivacySettingsEnabled(data.privacySettingsEnabled);
        setPrivacyRevision(data.privacyRevision ?? null);
        if (data.privacyProtocol) setPrivacyProtocol(data.privacyProtocol);
        setSettingsReady(true);
      })
      .catch(() => {
        if (!cancelled) setSettingsError("We could not load your settings. Retry before making changes.");
      });
    return () => { cancelled = true; };
  }, [business?.id, settingsReload]);

  useEffect(() => {
    let cancelled = false;
    setManualPreferenceReady(false);
    if (!business?.id) return;

    setInventoryLoading(true);
    Promise.all([
      fetch("/api/privacy/protexion/preferences", { headers: { "X-Business-Id": String(business.id) } }).then(async (res) => {
        if (!res.ok) throw new Error("Preference unavailable");
        const data = await res.json();
        if (typeof data.manual_enabled !== "boolean") throw new Error("Preference unavailable");
        return data;
      }),
      fetch("/api/privacy/inventory").then((res) => res.json()),
      fetch("/api/privacy/vault-status").then((res) => res.json()),
    ])
      .then(([preferenceData, inventoryData, vaultData]) => {
        if (cancelled) return;
        setManualPreferenceReady(true);
        setManualScreenPrivacyEnabled(!!preferenceData?.manual_enabled);
        setInventorySnapshot(
          (inventoryData?.latest_snapshot as PrivacyInventorySnapshot) ?? null,
        );
        setVaultStatus(vaultData as VaultStatus);
      })
      .catch((error) => {
        console.error("Error loading privacy extension data:", error);
      })
      .finally(() => {
        if (!cancelled) setInventoryLoading(false);
      });
    return () => { cancelled = true; };
  }, [business?.id, settingsReload]);

  useEffect(() => {
    if (!business?.id) return;

    setSessionsLoading(true);
    fetch("/api/security/sessions")
      .then((res) => res.json())
      .then((data) => {
        setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      })
      .catch((error) => {
        console.error("Error loading sessions:", error);
      })
      .finally(() => {
        setSessionsLoading(false);
      });
  }, [business?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!settingsReady) { toast.error("Load your settings before saving."); return; }
    if (!business?.id) {
      toast.error("Business not found");
      return;
    }

    if (!businessName.trim()) {
      toast.error("Business name is required");
      return;
    }

    setSaving(true);

    try {
      const profileRes = await fetch("/api/business/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Business-Id": String(business.id) },
        body: JSON.stringify({
          businessName,
          businessType,
          phoneNumber: phone,
          email,
          address,
          city,
          state,
          zipCode,
        }),
      });

      if (!profileRes.ok) throw new Error("Failed to save business profile");

      const settingsRes = await fetch("/api/business/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Business-Id": String(business.id) },
        body: JSON.stringify({
          defaultTaxRate: parseFloat(taxRate) / 100,
          collectTax,
          ...pinUpdate(posManagerPin, pinDirty),
          ...(privacySettingsEnabled ? { privacy_protocol: privacyProtocol, privacyRevision } : {}),
        }),
      });

      if (!settingsRes.ok) throw new Error(settingsRes.status === 409 ? "Settings changed. Reload before saving." : "Failed to save business settings");
      const savedSettings = businessSettingsResponseSchema.parse(await settingsRes.json());
      if (activeBusinessId.current !== business.id) return;
      setPinConfigured(savedSettings.posManagerPinConfigured); setPinDirty(false); setPosManagerPin("");
      setPrivacyRevision(savedSettings.privacyRevision ?? null);
      if (savedSettings.privacyProtocol) setPrivacyProtocol(savedSettings.privacyProtocol);

      window.dispatchEvent(new Event("drx:privacy-updated"));
      toast.success("Changes saved.");
      await refreshBusiness();
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(
        error?.message || "Failed to save settings. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const updateFieldVisibility = (
    field: PrivacyField,
    key: "visible" | "recommended",
    value: boolean,
  ) => {
    setPrivacyProtocol((prev) => {
      const next = {
        ...prev,
        fields: {
          ...prev.fields,
          [field]: {
            ...prev.fields[field],
            [key]: value,
          },
        },
      };

      if (key === "visible" && !value) {
        next.fields[field].recommended = false;
      }

      if (prev.alias_only_mode && field !== "alias") {
        return prev;
      }

      return next;
    });
  };

  const applyProfile = (profile: PrivacyProfile) => {
    setPrivacyProtocol(getDefaultPrivacyProtocol(profile));
  };

  const handleAliasOnlyToggle = (enabled: boolean) => {
    setPrivacyProtocol((prev) => {
      if (!enabled) {
        return {
          ...prev,
          alias_only_mode: false,
        };
      }

      return {
        ...prev,
        alias_only_mode: true,
        fields: {
          ...prev.fields,
          alias: { visible: true, recommended: true },
          first_name: { visible: false, recommended: false },
          phone: { visible: false, recommended: false },
          email: { visible: false, recommended: false },
          address: { visible: false, recommended: false },
          notes: { visible: false, recommended: false },
        },
      };
    });
  };

  const runCleanupNow = async () => {
    if (!business?.id) return;

    setCleanupRunning(true);
    try {
      const response = await fetch("/api/privacy/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Cleanup failed");
      }

      const deleted = Array.isArray(data.summary)
        ? data.summary.reduce(
            (total: number, row: { deleted?: number }) =>
              total + (row.deleted || 0),
            0,
          )
        : 0;

      toast.success(`Cleanup completed. ${deleted} inactive records deleted.`);
    } catch (error: any) {
      toast.error(error?.message || "Cleanup failed");
    } finally {
      setCleanupRunning(false);
    }
  };

  const refreshInventorySnapshot = async () => {
    setInventoryRefreshing(true);
    try {
      const response = await fetch("/api/privacy/inventory/refresh", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Couldn’t check what’s saved.");
      }
      setInventorySnapshot(data.snapshot as PrivacyInventorySnapshot);
      setPrivacyProtocol((prev) => ({
        ...prev,
        inventory_monitoring: {
          ...prev.inventory_monitoring,
          last_snapshot_at: data.last_snapshot_at,
        },
      }));
      toast.success("Saved details checked.");
    } catch (error: any) {
      toast.error(error?.message || "Couldn’t check what’s saved. Try again.");
    } finally {
      setInventoryRefreshing(false);
    }
  };

  const updateManualScreenPrivacyPreference = async (enabled: boolean) => {
    const requestedBusinessId = business?.id;
    if (!requestedBusinessId) return;
    try {
      const response = await fetch("/api/privacy/protexion/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Business-Id": requestedBusinessId },
        body: JSON.stringify({ manual_enabled: enabled }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update screen privacy preference",
        );
      }
      if (activeBusinessId.current !== requestedBusinessId) return;
      if (typeof data.manual_enabled !== "boolean") throw new Error("Invalid preference response");
      setManualScreenPrivacyEnabled(data.manual_enabled);
      window.dispatchEvent(new Event("drx:privacy-updated"));
      toast.success("Screen privacy preference updated");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update preference");
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      const response = await fetch(
        `/api/security/sessions/${sessionId}/revoke`,
        {
          method: "POST",
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to revoke session");
      }
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
      toast.success("Session revoked");
    } catch (error: any) {
      toast.error(error?.message || "Failed to revoke session");
    }
  };

  if (businessLoading) {
    return <AppPageSkeleton />;
  }

  if (!business) {
    return (
      <EmptyState
        icon={PackageOpen}
        title="Finish business setup"
        description="Create your business profile before changing business settings."
        actionLabel="Continue setup"
        onAction={() => router.push("/onboarding")}
        className="m-4 md:m-8"
      />
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure your business settings
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
          <p className="text-xs text-muted-foreground">v{appPackage.version}</p>
          <div className="flex gap-2">
            {hasPermission("settings.configure_pos") && (
              <Link href="/settings/commerce">
                <Button variant="outline" className="gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  Commerce & Delivery
                </Button>
              </Link>
            )}
            {hasPermission("settings.configure_pos") && (
              <Link href="/settings/credit">
                <Button variant="outline">Credit recommendations</Button>
              </Link>
            )}
            {hasPermission("inventory.manage") && (
              <Link href="/settings/inventory/aliases">
                <Button variant="outline" className="gap-2">
                  <Users className="w-4 h-4" />
                  Manage Aliases
                </Button>
              </Link>
            )}
            {hasPermission("users.manage") && (
              <Link href="/settings/team">
                <Button variant="outline" className="gap-2">
                  <Users className="w-4 h-4" />
                  Manage Team
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {settingsError && <div role="alert" className="rounded-lg border p-4"><p>{settingsError}</p><Button type="button" variant="outline" onClick={() => setSettingsReload(value => value + 1)}>Retry settings</Button></div>}
      {!settingsReady && !settingsError && <p role="status">Loading settings…</p>}
      <form onSubmit={handleSave} className="space-y-4 md:space-y-6">
        <fieldset disabled={!settingsReady || saving} className="space-y-4 md:space-y-6">
        <div className="md:hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 flex items-center gap-2">
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className={
                    "h-2 flex-1 rounded-full transition-all " +
                    (s <= mobileStep ? "bg-accent" : "bg-muted")
                  }
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground shrink-0">
              Step {mobileStep} of 2
            </span>
          </div>
        </div>

        <Card
          id="tour-settings-profile"
          className={mobileStep === 1 ? "" : "hidden md:block"}
        >
          <CardHeader>
            <CardTitle>Business Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Business name"
                  disabled={saving}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessType">Business Type</Label>
                <Input
                  id="businessType"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  placeholder="e.g., Retail, Wholesale"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="business@example.com"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St"
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="New York"
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="NY"
                  maxLength={2}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="10001"
                  disabled={saving}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={mobileStep === 2 ? "" : "hidden md:block"}>
          <CardHeader>
            <CardTitle>Business Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="collect-tax" className="text-base">
                  Enable Tax Collection
                </Label>
                <p className="text-sm text-muted-foreground">
                  When disabled, no tax will be charged on sales. Subtotal =
                  Total.
                </p>
              </div>
              <Switch
                id="collect-tax"
                checked={collectTax}
                onCheckedChange={setCollectTax}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                placeholder="8.0"
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        <Card className={mobileStep === 2 ? "" : "hidden md:block"}>
          <CardHeader>
            <CardTitle>POS Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="posManagerPin">Manager PIN</Label>
              <Input
                id="posManagerPin"
                type="password"
                autoComplete="new-password"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={4}
                value={posManagerPin}
                onChange={(e) => { setPosManagerPin(e.target.value); setPinDirty(true); }}
                placeholder={pinConfigured ? "Enter a replacement PIN" : "Set 4-digit PIN"}
                disabled={saving}
              />
              <p className="text-sm text-muted-foreground">
                {pinDirty && !posManagerPin ? "The PIN will be removed when you save." : pinConfigured ? "A PIN is set. Leave this field unchanged to keep it." : "Set a PIN to require verification when exiting Quick Sale."}
              </p>
              {pinConfigured && <Button type="button" variant="outline" onClick={() => { setPosManagerPin(""); setPinDirty(true); }} disabled={saving}>Remove PIN</Button>}
            </div>
          </CardContent>
        </Card>

        <Card
          id="tour-settings-privacy"
          className={mobileStep === 2 ? "" : "hidden md:block"}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Privacy Protocol Dashboard
            </CardTitle>
          </CardHeader>
          {!privacySettingsEnabled && <p className="px-6 pb-4">Privacy settings are currently unavailable.</p>}
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="privacyProfile">Onboarding Profile</Label>
              <select
                id="privacyProfile"
                value={privacyProtocol.profile}
                onChange={(e) => applyProfile(e.target.value as PrivacyProfile)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                disabled={saving || !privacySettingsEnabled}
              >
                {PRIVACY_PROFILE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {
                  PRIVACY_PROFILE_OPTIONS.find(
                    (option) => option.id === privacyProtocol.profile,
                  )?.description
                }
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="aliasOnlyMode">Save aliases only</Label>
                <p className="text-xs text-muted-foreground">
                  Stop this business from saving other customer details.
                </p>
              </div>
              <Switch
                id="aliasOnlyMode"
                checked={privacyProtocol.alias_only_mode}
                onCheckedChange={handleAliasOnlyToggle}
                disabled={saving || !privacySettingsEnabled}
              />
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">Hide details</p>
              <div className="space-y-1">
                <Label htmlFor="screenPrivacyMode">When to hide details</Label>
                <select
                  id="screenPrivacyMode"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={privacyProtocol.screen_privacy.mode}
                  onChange={(e) =>
                    setPrivacyProtocol((prev) => ({
                      ...prev,
                      screen_privacy: {
                        ...prev.screen_privacy,
                        mode: e.target.value as ScreenPrivacyMode,
                      },
                    }))
                  }
                  disabled={saving || !privacySettingsEnabled}
                >
                  <option value="manual">When I turn it on</option>
                  <option value="pos_only">During a new sale</option>
                  <option value="always_on">Always</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="screenPrivacyDefaultEnabled">
                  Start with details hidden
                </Label>
                <Switch
                  id="screenPrivacyDefaultEnabled"
                  checked={privacyProtocol.screen_privacy.default_enabled}
                  onCheckedChange={(value) =>
                    setPrivacyProtocol((prev) => ({
                      ...prev,
                      screen_privacy: {
                        ...prev.screen_privacy,
                        default_enabled: value,
                      },
                    }))
                  }
                  disabled={saving || !privacySettingsEnabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="manualScreenPrivacy">Hide details now</Label>
                <Switch
                  id="manualScreenPrivacy"
                  checked={manualScreenPrivacyEnabled}
                  onCheckedChange={updateManualScreenPrivacyPreference}
                  disabled={saving || !manualPreferenceReady}
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Customer details</p>
              {PRIVACY_FIELDS.map((field) => (
                <div
                  key={field}
                  className="grid grid-cols-3 items-center gap-3 rounded-lg border p-3"
                >
                  <p className="text-sm font-medium">{FIELD_LABELS[field]}</p>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      Save
                    </Label>
                    <Switch
                      checked={privacyProtocol.fields[field].visible}
                      onCheckedChange={(value) =>
                        updateFieldVisibility(field, "visible", value)
                      }
                      disabled={
                        saving || !privacySettingsEnabled ||
                        (privacyProtocol.alias_only_mode && field !== "alias")
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      Suggested
                    </Label>
                    <Switch
                      checked={privacyProtocol.fields[field].recommended}
                      onCheckedChange={(value) =>
                        updateFieldVisibility(field, "recommended", value)
                      }
                      disabled={
                        saving || !privacySettingsEnabled ||
                        !privacyProtocol.fields[field].visible ||
                        (privacyProtocol.alias_only_mode && field !== "alias")
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">Retention controls</p>
              <div className="flex items-center justify-between">
                <Label htmlFor="retentionEnabled">
                  Enable retention cleanup
                </Label>
                <Switch
                  id="retentionEnabled"
                  checked={privacyProtocol.retention.enabled}
                  onCheckedChange={(value) =>
                    setPrivacyProtocol((prev) => ({
                      ...prev,
                      retention: {
                        ...prev.retention,
                        enabled: value,
                      },
                    }))
                  }
                  disabled={saving || !privacySettingsEnabled}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="retentionDays">Days</Label>
                  <Input
                    id="retentionDays"
                    type="number"
                    min={1}
                    max={3650}
                    value={privacyProtocol.retention.days}
                    onChange={(e) =>
                      setPrivacyProtocol((prev) => ({
                        ...prev,
                        retention: {
                          ...prev.retention,
                          days: Math.max(1, Number(e.target.value || 1)),
                        },
                      }))
                    }
                    disabled={saving || !privacySettingsEnabled}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="retentionFrequency">Frequency</Label>
                  <select
                    id="retentionFrequency"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={privacyProtocol.retention.frequency}
                    onChange={(e) =>
                      setPrivacyProtocol((prev) => ({
                        ...prev,
                        retention: {
                          ...prev.retention,
                          frequency: e.target.value as "daily" | "weekly",
                        },
                      }))
                    }
                    disabled={saving || !privacySettingsEnabled}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="retentionHour">Local hour (0-23)</Label>
                  <Input
                    id="retentionHour"
                    type="number"
                    min={0}
                    max={23}
                    value={privacyProtocol.retention.local_hour}
                    onChange={(e) =>
                      setPrivacyProtocol((prev) => ({
                        ...prev,
                        retention: {
                          ...prev.retention,
                          local_hour: Math.max(
                            0,
                            Math.min(23, Number(e.target.value || 0)),
                          ),
                        },
                      }))
                    }
                    disabled={saving || !privacySettingsEnabled}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="hardDelete">Hard delete inactive records</Label>
                <Switch
                  id="hardDelete"
                  checked={privacyProtocol.retention.hard_delete}
                  onCheckedChange={(value) =>
                    setPrivacyProtocol((prev) => ({
                      ...prev,
                      retention: {
                        ...prev.retention,
                        hard_delete: value,
                      },
                    }))
                  }
                  disabled={saving || !privacySettingsEnabled}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={runCleanupNow}
                disabled={cleanupRunning}
              >
                {cleanupRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running cleanup...
                  </>
                ) : (
                  "Run cleanup now"
                )}
              </Button>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">Ephemeral customer profiles</p>
              <div className="flex items-center justify-between">
                <Label htmlFor="ephemeralEnabled">
                  Enable ephemeral profiles
                </Label>
                <Switch
                  id="ephemeralEnabled"
                  checked={privacyProtocol.ephemeral_profiles.enabled}
                  onCheckedChange={(value) =>
                    setPrivacyProtocol((prev) => ({
                      ...prev,
                      ephemeral_profiles: {
                        ...prev.ephemeral_profiles,
                        enabled: value,
                      },
                    }))
                  }
                  disabled={saving || !privacySettingsEnabled}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ephemeralRetentionDays">
                  Default retention
                </Label>
                <select
                  id="ephemeralRetentionDays"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={
                    privacyProtocol.ephemeral_profiles.default_retention_days
                  }
                  onChange={(e) =>
                    setPrivacyProtocol((prev) => ({
                      ...prev,
                      ephemeral_profiles: {
                        ...prev.ephemeral_profiles,
                        default_retention_days: Number(e.target.value) as
                          | 1
                          | 7
                          | 30,
                      },
                    }))
                  }
                  disabled={saving || !privacySettingsEnabled}
                >
                  <option value={1}>24 hours</option>
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="allowEphemeralCreate">
                  Allow in standard customer create
                </Label>
                <Switch
                  id="allowEphemeralCreate"
                  checked={
                    privacyProtocol.ephemeral_profiles
                      .allow_in_standard_customer_create
                  }
                  onCheckedChange={(value) =>
                    setPrivacyProtocol((prev) => ({
                      ...prev,
                      ephemeral_profiles: {
                        ...prev.ephemeral_profiles,
                        allow_in_standard_customer_create: value,
                      },
                    }))
                  }
                  disabled={saving || !privacySettingsEnabled}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">Customer Data Inventory</p>
              <div className="flex items-center justify-between">
                <Label htmlFor="inventoryMonitoringEnabled">
                  Enable inventory monitoring
                </Label>
                <Switch
                  id="inventoryMonitoringEnabled"
                  checked={privacyProtocol.inventory_monitoring.enabled}
                  onCheckedChange={(value) =>
                    setPrivacyProtocol((prev) => ({
                      ...prev,
                      inventory_monitoring: {
                        ...prev.inventory_monitoring,
                        enabled: value,
                      },
                    }))
                  }
                  disabled={saving || !privacySettingsEnabled}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="inventoryRefreshFrequency">
                  Refresh frequency
                </Label>
                <select
                  id="inventoryRefreshFrequency"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={privacyProtocol.inventory_monitoring.refresh_frequency}
                  onChange={(e) =>
                    setPrivacyProtocol((prev) => ({
                      ...prev,
                      inventory_monitoring: {
                        ...prev.inventory_monitoring,
                        refresh_frequency: e.target.value as "manual" | "daily",
                      },
                    }))
                  }
                  disabled={saving || !privacySettingsEnabled}
                >
                  <option value="daily">Daily</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              {inventoryLoading ? (
                <div
                  className="grid grid-cols-2 gap-3"
                  aria-label="Checking what’s saved"
                  aria-busy="true"
                >
                  {[0, 1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-12 w-full" />
                  ))}
                </div>
              ) : inventorySnapshot ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <p>
                    Aliases: {inventorySnapshot.alias_count} (
                    {inventorySnapshot.alias_delta >= 0 ? "+" : ""}
                    {inventorySnapshot.alias_delta})
                  </p>
                  <p>
                    Phones: {inventorySnapshot.phone_count} (
                    {inventorySnapshot.phone_delta >= 0 ? "+" : ""}
                    {inventorySnapshot.phone_delta})
                  </p>
                  <p>
                    Emails: {inventorySnapshot.email_count} (
                    {inventorySnapshot.email_delta >= 0 ? "+" : ""}
                    {inventorySnapshot.email_delta})
                  </p>
                  <p>
                    Addresses: {inventorySnapshot.address_count} (
                    {inventorySnapshot.address_delta >= 0 ? "+" : ""}
                    {inventorySnapshot.address_delta})
                  </p>
                  <p>
                    Notes: {inventorySnapshot.notes_count} (
                    {inventorySnapshot.notes_delta >= 0 ? "+" : ""}
                    {inventorySnapshot.notes_delta})
                  </p>
                  <p className="text-xs text-muted-foreground md:col-span-2">
                    Last snapshot{" "}
                    {new Date(inventorySnapshot.captured_at).toLocaleString()}
                  </p>
                  {[
                    inventorySnapshot.alias_delta,
                    inventorySnapshot.phone_delta,
                    inventorySnapshot.email_delta,
                    inventorySnapshot.address_delta,
                    inventorySnapshot.notes_delta,
                  ].some((delta) => delta > 0) ? (
                    <p className="text-xs text-amber-600 md:col-span-2">
                      More customer details are saved than at the last check.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No saved-details check yet. Run the first check.
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={refreshInventorySnapshot}
                disabled={inventoryRefreshing}
              >
                {inventoryRefreshing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Check what’s saved"
                )}
              </Button>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">Protection status</p>
              {vaultStatus ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <p>
                    Protection on:{" "}
                    {vaultStatus.vault_mode_active ? "Yes" : "No"}
                  </p>
                  <p>
                    Current key ready:{" "}
                    {vaultStatus.current_key_loaded ? "Yes" : "No"}
                  </p>
                  <p>
                    Previous key ready:{" "}
                    {vaultStatus.previous_key_loaded ? "Yes" : "No"}
                  </p>
                  <p>
                    Lookup key ready:{" "}
                    {vaultStatus.hash_key_loaded ? "Yes" : "No"}
                  </p>
                  <p className="text-xs text-muted-foreground md:col-span-2">
                    Last protection error:{" "}
                    {vaultStatus.last_error_at
                      ? new Date(vaultStatus.last_error_at).toLocaleString()
                      : "None"}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Protection status is not available.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card
          id="tour-settings-sessions"
          className={mobileStep === 2 ? "" : "hidden md:block"}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Device Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessionsLoading ? (
              <div
                className="space-y-3"
                aria-label="Loading device sessions"
                aria-busy="true"
              >
                {[0, 1, 2].map((item) => (
                  <Skeleton key={item} className="h-14 w-full" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No active sessions found.
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-4 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {session.browser} • {session.device_type || "unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {session.city || "Unknown city"},{" "}
                      {session.country || "Unknown country"}
                      {session.ip ? ` • ${session.ip}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last active{" "}
                      {new Date(session.last_active_at).toLocaleString()}
                    </p>
                  </div>
                  {session.is_current ? (
                    <span className="text-xs font-medium text-emerald-600">
                      Current
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => revokeSession(session.id)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="md:hidden flex gap-2">
          {mobileStep === 2 && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setMobileStep(1)}
              disabled={saving}
            >
              Back
            </Button>
          )}

          {mobileStep === 1 ? (
            <Button
              type="button"
              size="lg"
              className="flex-1"
              onClick={() => setMobileStep(2)}
              disabled={saving || !businessName.trim()}
            >
              Continue
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={saving}
              size="lg"
              className="flex-1"
            >
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          )}
        </div>

        <div className="hidden md:flex justify-end">
          <Button type="submit" disabled={saving} size="lg">
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
        </fieldset>
      </form>

      <Tour
        tourId="settings_v1"
        onComplete={() => {}}
        steps={[
          {
            targetId: "tour-settings-profile",
            title: "Your business.",
            description:
              "Update your name, contact info, and address. This shows up on receipts and reports.",
          },
          {
            targetId: "tour-settings-privacy",
            title: "Privacy controls.",
            description:
              "Set how customer data is collected and masked. Alias-only mode keeps it tight.",
          },
          {
            targetId: "tour-settings-sessions",
            title: "Active sessions.",
            description:
              "See every device logged in. Revoke anything you don't recognize.",
          },
        ]}
      />
    </div>
  );
}
