"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useBusiness } from "@/lib/hooks/use-business";
import { usePermission } from "@/lib/hooks/use-permission";
import { getSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
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
  const [saving, setSaving] = useState(false);
  const [mobileStep, setMobileStep] = useState<1 | 2>(1);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (business) {
      setBusinessName(business.business_name || "");
      setBusinessType(business.business_type || "");
      setPhone(business.phone_number || "");
      setEmail(business.email || "");
      setAddress(business.address || "");
      setCity(business.city || "");
      setState(business.state || "");
      setZipCode(business.zip_code || "");
    }
  }, [business]);

  useEffect(() => {
    if (business?.id && supabase) {
      supabase
        .from("business_settings")
        .select("default_tax_rate, collect_tax, pos_manager_pin")
        .eq("business_id", business.id)
        .single()
        .then(({ data }: any) => {
          if (data) {
            setTaxRate((data.default_tax_rate * 100).toFixed(2));
            setCollectTax(data.collect_tax !== false);
            setPosManagerPin(data.pos_manager_pin || "");
          }
        })
        .catch((error: any) => {
          console.error("Error loading business settings:", error);
        });
    }
  }, [business?.id, supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!business?.id || !supabase) {
      toast.error("Business not found");
      return;
    }

    if (!businessName.trim()) {
      toast.error("Business name is required");
      return;
    }

    setSaving(true);

    try {
      const { error: businessError } = await supabase
        .from("business_profile")
        .update({
          business_name: businessName,
          business_type: businessType || null,
          phone_number: phone || null,
          email: email || null,
          address: address || null,
          city: city || null,
          state: state || null,
          zip_code: zipCode || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", business.id);

      if (businessError) throw businessError;

      if (taxRate) {
        const { error: settingsError } = await supabase
          .from("business_settings")
          .update({
            default_tax_rate: parseFloat(taxRate) / 100,
            collect_tax: collectTax,
            pos_manager_pin: posManagerPin || null,
            updated_at: new Date().toISOString(),
          })
          .eq("business_id", business.id);

        if (settingsError) throw settingsError;
      }

      toast.success("Settings saved successfully!");
      await refreshBusiness();

      // Force a small delay to ensure data is persisted
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(
        error?.message || "Failed to save settings. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (businessLoading) {
    return <div className="p-4 md:p-8">Loading...</div>;
  }

  if (!business) {
    return (
      <div className="p-4 md:p-8">
        No business found. Please set up your business first.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure your business settings
          </p>
        </div>
        {hasPermission("users.manage") && (
          <Link href="/settings/team">
            <Button variant="outline" className="gap-2">
              <Users className="w-4 h-4" />
              Manage Team
            </Button>
          </Link>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4 md:space-y-6">
        {/* Mobile progress */}
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

        {/* Business Profile */}
        <Card className={mobileStep === 1 ? "" : "hidden md:block"}>
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

        {/* Business Preferences */}
        <Card className={mobileStep === 2 ? "" : "hidden md:block"}>
          <CardHeader>
            <CardTitle>Business Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tax Collection Toggle */}
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

            {/* Tax Rate */}
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
              <p className="text-sm text-muted-foreground">
                This tax rate will be applied to all sales by default
              </p>
            </div>
          </CardContent>
        </Card>

        {/* POS Security */}
        <Card className={mobileStep === 2 ? "" : "hidden md:block"}>
          <CardHeader>
            <CardTitle>POS Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="posManagerPin">Manager PIN</Label>
              <Input
                id="posManagerPin"
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={4}
                value={posManagerPin}
                onChange={(e) => setPosManagerPin(e.target.value)}
                placeholder="1234"
                disabled={saving}
              />
              <p className="text-sm text-muted-foreground">
                PIN required for manager overrides (e.g., selling below cost).
                Default is 1234.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mobile step controls */}
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
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          )}
        </div>

        {/* Desktop save */}
        <div className="hidden md:flex justify-end">
          <Button type="submit" disabled={saving} size="lg">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
