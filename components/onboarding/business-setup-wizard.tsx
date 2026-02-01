"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Sparkles, Shield, Scale, Layers } from "lucide-react";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import Image from "next/image";

interface BusinessFormData {
  business_name: string;
  business_type: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone_number: string;
  email: string;
  recovery_email: string;
  default_tax_rate: number;
  privacy_preset: "open" | "balanced" | "private" | "max_secure";
  supported_units: string[];
}

export function BusinessSetupWizard({
  userId,
  onComplete,
}: {
  userId: string;
  onComplete?: () => Promise<void>;
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<BusinessFormData>({
    business_name: "",
    business_type: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    phone_number: "",
    email: "",
    recovery_email: "",
    default_tax_rate: 8.0,
    privacy_preset: "balanced",
    supported_units: ["g", "oz", "lb", "L", "ml"],
  });
  const router = useRouter();
  const supabase = getSupabaseClient();

  const updateField = (
    field: keyof BusinessFormData,
    value: string | number | string[],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!supabase) {
      toast.error("Unable to connect to database");
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);
    try {
      if (!formData.business_name.trim()) {
        toast.error("Business name is required");
        setLoading(false);
        return;
      }

      // Create business profile
      const { data: business, error: businessError } = await supabase
        .from("business_profile")
        .insert({
          business_name: formData.business_name,
          business_type: formData.business_type || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          zip_code: formData.zip_code || null,
          phone_number: formData.phone_number || null,
          email: formData.email || null,
          owner_id: userId,
          is_active: true,
        })
        .select()
        .single();

      if (businessError) throw businessError;

      // Create user role
      const { error: roleError } = await supabase.from("user_roles").insert({
        business_id: business.id,
        user_id: userId,
        role: "owner",
        permissions: {},
      });

      if (roleError) throw roleError;

      // Create business settings
      const { error: settingsError } = await supabase
        .from("business_settings")
        .insert({
          business_id: business.id,
          default_tax_rate: formData.default_tax_rate / 100,
          currency: "USD",
          timezone: "America/New_York",
          privacy_preset: formData.privacy_preset,
          supported_units: formData.supported_units,
          settings_data: {
            audit_retention_days: 365,
            allowed_export_types: ["csv", "pdf"],
            gdpr_mode: formData.privacy_preset === "max_secure",
            intake_reasons: ["Restock", "Sample Return", "Correction"],
            adjustment_reasons: ["Theft", "Damage", "Recount", "Gift"],
          },
        });

      if (settingsError) throw settingsError;

      // Mark onboarding as completed
      await supabase
        .from("business_profile")
        .update({
          onboarding_completed: true,
          recovery_email: formData.recovery_email,
        })
        .eq("id", business.id);

      setStep(6);
      toast.success("Business created successfully!");

      setTimeout(() => {
        if (onComplete) {
          onComplete();
        } else {
          router.refresh();
        }
      }, 2000);
    } catch (error) {
      console.error("Error creating business:", error);
      toast.error("Failed to create business. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-accent/20">
        <CardHeader>
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <Image
              src="/icon.svg"
              alt="DRX Logo"
              width={48}
              height={48}
              className="opacity-90"
            />
          </div>

          {/* Progress Bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 flex-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-2 flex-1 rounded-full transition-all ${
                    s <= step ? "bg-accent" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground ml-4">
              Step {step > 5 ? 5 : step} of 5
            </span>
          </div>

          <CardTitle className="text-2xl text-center">
            {step === 1 && "Welcome to DRX"}
            {step === 2 && "Business Information"}
            {step === 3 && "Supported Units"}
            {step === 4 && "Privacy Presets"}
            {step === 5 && "Business Settings & Review"}
            {step === 6 && "All Set!"}
          </CardTitle>
          <CardDescription className="text-center">
            {step === 1 && "Let's set up your business to get started"}
            {step === 2 && "Tell us about your business"}
            {step === 3 && "Select units your business supports"}
            {step === 4 && "Choose your privacy and security level"}
            {step === 5 && "Configure your business preferences"}
            {step === 6 && "Your business is ready to use"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex justify-center py-8">
                <div className="relative">
                  <Sparkles className="h-24 w-24 text-accent" />
                  <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full" />
                </div>
              </div>
              <div className="space-y-2 text-center">
                <h3 className="text-lg font-semibold">
                  Privacy-First POS & CRM
                </h3>
                <p className="text-muted-foreground">
                  DRX helps you manage sales, inventory, customers, and credit
                  tracking all in one place. Let's create your business profile
                  to get started.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="text-center p-4 border border-accent/20 rounded-lg bg-accent/5">
                  <p className="font-medium">Point of Sale</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Fast checkout with inventory tracking
                  </p>
                </div>
                <div className="text-center p-4 border border-accent/20 rounded-lg bg-accent/5">
                  <p className="font-medium">Credit Management</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track customer credit and payments
                  </p>
                </div>
                <div className="text-center p-4 border border-accent/20 rounded-lg bg-accent/5">
                  <p className="font-medium">Inventory Control</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Real-time stock management
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setStep(2)}
                  size="lg"
                  className="bg-accent hover:bg-accent-dark text-black font-semibold"
                >
                  Get Started
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Business Info */}
          {step === 2 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStep(3);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="business_name">
                  Business Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) => updateField("business_name", e.target.value)}
                  placeholder="e.g., Acme Dispensary"
                  required
                  className="border-accent/20 focus:border-accent"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_type">
                  Business Type
                  <HelpTooltip content="What type of business do you operate? (e.g., Retail, Dispensary, Wholesale)" />
                </Label>
                <Input
                  id="business_type"
                  value={formData.business_type}
                  onChange={(e) => updateField("business_type", e.target.value)}
                  placeholder="e.g., Retail, Dispensary, Wholesale"
                  className="border-accent/20 focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) =>
                      updateField("phone_number", e.target.value)
                    }
                    placeholder="(555) 123-4567"
                    className="border-accent/20 focus:border-accent"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="contact@business.com"
                    className="border-accent/20 focus:border-accent"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="123 Main St"
                  className="border-accent/20 focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    placeholder="New York"
                    className="border-accent/20 focus:border-accent"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => updateField("state", e.target.value)}
                    placeholder="NY"
                    maxLength={2}
                    className="border-accent/20 focus:border-accent"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">ZIP Code</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => updateField("zip_code", e.target.value)}
                    placeholder="10001"
                    className="border-accent/20 focus:border-accent"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recovery_email">
                  Recovery Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="recovery_email"
                  type="email"
                  value={formData.recovery_email}
                  onChange={(e) =>
                    updateField("recovery_email", e.target.value)
                  }
                  placeholder="recovery@email.com"
                  required
                  className="border-accent/20 focus:border-accent"
                />
                <p className="text-xs text-muted-foreground">
                  Secondary email for account recovery and critical security
                  alerts.
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={!formData.business_name.trim()}
                  className="bg-accent hover:bg-accent-dark text-black font-semibold"
                >
                  Continue
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Units */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex justify-center py-4">
                <Scale className="h-16 w-16 text-accent" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { id: "g", label: "Grams", desc: "Solid mass" },
                  { id: "oz", label: "Ounces", desc: "Mass/Liquid" },
                  { id: "lb", label: "Pounds", desc: "Bulk mass" },
                  { id: "L", label: "Liters", desc: "Liquid volume" },
                  { id: "ml", label: "Milliliters", desc: "Small liquid" },
                ].map((unit) => (
                  <button
                    key={unit.id}
                    onClick={() => {
                      const units = [...formData.supported_units];
                      if (units.includes(unit.id)) {
                        if (units.length > 1) {
                          updateField(
                            "supported_units",
                            units.filter((u) => u !== unit.id),
                          );
                        } else {
                          toast.error("At least one unit must be enabled");
                        }
                      } else {
                        updateField("supported_units", [...units, unit.id]);
                      }
                    }}
                    className={`p-4 border rounded-lg text-left transition-all ${
                      formData.supported_units.includes(unit.id)
                        ? "border-accent bg-accent/10"
                        : "border-muted hover:border-accent/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{unit.label}</p>
                      {formData.supported_units.includes(unit.id) && (
                        <CheckCircle2 className="h-4 w-4 text-accent" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {unit.desc}
                    </p>
                  </button>
                ))}
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  className="bg-accent hover:bg-accent-dark text-black font-semibold"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Privacy Presets */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex justify-center py-4">
                <Shield className="h-16 w-16 text-accent" />
              </div>
              <div className="space-y-3">
                {[
                  {
                    id: "open",
                    label: "Open CRM",
                    desc: "Standard retail. Customers fully transparent.",
                    features: [
                      "Full names visible",
                      "Standard audit logs",
                      "No PII masking",
                    ],
                  },
                  {
                    id: "balanced",
                    label: "Balanced (Recommended)",
                    desc: "Ideal mix of audit trails and customer privacy.",
                    features: [
                      "Phone/Email visible to staff",
                      "Audit logs tracked",
                      "Strict role access",
                    ],
                  },
                  {
                    id: "private",
                    label: "Private / Secure",
                    desc: "Limited staff access to identifiable information.",
                    features: [
                      "Last names masked",
                      "Admin-only PII access",
                      "365-day log retention",
                    ],
                  },
                  {
                    id: "max_secure",
                    label: "Maximum Secure / Alias-Only",
                    desc: "No PII stored on device. Everything is aliased.",
                    features: [
                      "Zero PII on-disk",
                      "All customers aliased",
                      "Burn-mode enabled",
                    ],
                  },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() =>
                      updateField("privacy_preset", preset.id as any)
                    }
                    className={`w-full p-4 border rounded-lg text-left transition-all ${
                      formData.privacy_preset === preset.id
                        ? "border-accent bg-accent/10"
                        : "border-muted hover:border-accent/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold uppercase text-xs tracking-wider">
                        {preset.label}
                      </p>
                      {formData.privacy_preset === preset.id && (
                        <CheckCircle2 className="h-4 w-4 text-accent" />
                      )}
                    </div>
                    <p className="text-sm font-medium mb-2">{preset.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {preset.features.map((f, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(3)}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep(5)}
                  className="bg-accent hover:bg-accent-dark text-black font-semibold"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Review & Final Settings */}
          {step === 5 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex justify-center py-4">
                <Layers className="h-16 w-16 text-accent" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_tax_rate">
                  Default Tax Rate (%)
                  <HelpTooltip content="This tax rate will be automatically applied to sales. You can change this later in settings." />
                </Label>
                <Input
                  id="default_tax_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.default_tax_rate}
                  onChange={(e) =>
                    updateField(
                      "default_tax_rate",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  placeholder="8.0"
                  className="border-accent/20 focus:border-accent"
                />
                <p className="text-sm text-muted-foreground">
                  Example: 8.0 for 8% sales tax
                </p>
              </div>

              <div className="bg-accent/10 border border-accent/20 p-4 rounded-lg space-y-2">
                <h4 className="font-medium">Review Your Information</h4>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Business:</span>{" "}
                    {formData.business_name}
                  </p>
                  {formData.business_type && (
                    <p>
                      <span className="text-muted-foreground">Type:</span>{" "}
                      {formData.business_type}
                    </p>
                  )}
                  <p>
                    <span className="text-muted-foreground">Location:</span>{" "}
                    {formData.city}, {formData.state}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Privacy Mode:</span>{" "}
                    <span className="uppercase font-bold text-accent">
                      {formData.privacy_preset}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">
                      Enabled Units:
                    </span>{" "}
                    {formData.supported_units.join(", ")}
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(4)}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-accent hover:bg-accent-dark text-black font-semibold"
                >
                  {loading ? "Creating..." : "Create Business"}
                </Button>
              </div>
            </form>
          )}

          {/* Step 6: Success */}
          {step === 6 && (
            <div className="space-y-4 text-center py-8">
              <div className="flex justify-center">
                <div className="relative">
                  <CheckCircle2 className="h-24 w-24 text-accent" />
                  <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">You're All Set!</h3>
                <p className="text-muted-foreground">
                  Your business has been created successfully. Redirecting you
                  to the dashboard...
                </p>
              </div>
              <div className="space-y-2 pt-4">
                <p className="text-sm font-medium">Next Steps:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Add your first products</li>
                  <li>✓ Create customer profiles</li>
                  <li>✓ Start making sales</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
