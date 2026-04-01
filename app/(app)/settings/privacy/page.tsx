"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useBusiness } from "@/lib/hooks/use-business";
import { getSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  Save,
  Trash2,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { PrivacyPreset, purgeBusinessData } from "@/lib/utils/privacy";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export default function PrivacySettingsPage() {
  const router = useRouter();
  const { business, settings, refreshBusiness } = useBusiness();
  const [privacyPreset, setPrivacyPreset] = useState<PrivacyPreset>("balanced");
  const [gdprMode, setGdprMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [purging, setPurging] = useState(false);
  const [burnConfirmText, setBurnConfirmText] = useState("");
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (settings) {
      setPrivacyPreset(settings.privacy_preset as PrivacyPreset);
      setGdprMode(settings.settings_data?.gdpr_mode || false);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!business?.id || !supabase) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("business_settings")
        .update({
          privacy_preset: privacyPreset,
          settings_data: {
            ...settings?.settings_data,
            gdpr_mode: gdprMode,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("business_id", business.id);

      if (error) throw error;

      toast.success("Privacy settings updated successfully");
      await refreshBusiness();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBurnMode = async () => {
    if (!business?.id || !supabase) return;
    if (burnConfirmText !== "BURN") {
      toast.error("Please type BURN to confirm");
      return;
    }

    setPurging(true);
    try {
      const { success, error } = await purgeBusinessData(supabase, business.id);
      if (!success) throw new Error(error);

      toast.success("Business data purged successfully");
      router.push("/onboarding"); // Redirect to onboarding
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to purge data",
      );
    } finally {
      setPurging(false);
    }
  };

  const presets = [
    {
      id: "open",
      name: "Open CRM",
      icon: Eye,
      description:
        "No data masking. Best for small shops where customer relationship is fully transparent.",
      color: "text-blue-500",
    },
    {
      id: "balanced",
      name: "Balanced",
      icon: Shield,
      description:
        "Masks email/phone partially. Our recommended security level for standard retail.",
      color: "text-green-500",
    },
    {
      id: "private",
      name: "Secured / Private",
      icon: Lock,
      description:
        "Masks last names and full contact info. Only admins can see full details.",
      color: "text-orange-500",
    },
    {
      id: "max_secure",
      name: "Max Secure",
      icon: AlertTriangle,
      description:
        "Aliased identities only. Zero PII storage on local cache. Burn-mode available.",
      color: "text-red-500",
    },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Privacy & Security</h1>
        <p className="text-muted-foreground mt-2">
          Control how customer data is handled and stored across your business.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Data Retention Level</CardTitle>
            <CardDescription>
              Choose a preset to automatically configure masking and visibility
              rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setPrivacyPreset(preset.id as PrivacyPreset)}
                  className={`flex flex-col p-4 border rounded-xl text-left transition-all hover:bg-muted/50 ${
                    privacyPreset === preset.id
                      ? "border-accent ring-2 ring-accent/20 bg-accent/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <preset.icon className={`h-5 w-5 ${preset.color}`} />
                    <span className="font-bold">{preset.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {preset.description}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security Features</CardTitle>
            <CardDescription>
              Enable additional legal and security protections.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>GDPR Enforce Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Allow customers to request data deletion via public endpoints.
                </p>
              </div>
              <Switch checked={gdprMode} onCheckedChange={setGdprMode} />
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-destructive">
                    Burn Mode (Emergency Only)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Immediately purge all customer PII and transactions.{" "}
                    <b>Irreversible.</b>
                  </p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={purging}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {purging ? "PURGING..." : "INITIATE"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-5 w-5" />
                        Extreme Caution Required
                      </DialogTitle>
                      <DialogDescription className="space-y-4">
                        <p>
                          You are about to{" "}
                          <b>permanently and irreversibly delete</b> all
                          customer records, sales history, and transaction logs
                          for this business.
                        </p>
                        <p>
                          Base inventory products will remain, but all
                          associated movement history and customer relationships
                          will be gone forever.
                        </p>
                        <div className="space-y-2">
                          <Label>
                            Type <b>BURN</b> to confirm:
                          </Label>
                          <Input
                            placeholder="BURN"
                            value={burnConfirmText}
                            onChange={(e) => setBurnConfirmText(e.target.value)}
                            className="border-destructive focus-visible:ring-destructive"
                          />
                        </div>
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setBurnConfirmText("")}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleBurnMode}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={burnConfirmText !== "BURN" || purging}
                      >
                        Purge Everything
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full md:w-auto"
          >
            {saving ? "Saving..." : "Save Privacy Settings"}
            {!saving && <Save className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
