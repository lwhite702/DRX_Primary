"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Loader2,
  Building2,
  User,
  Scale,
  Zap,
  Shield,
  Users,
  ClipboardList,
  Tag,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

interface BusinessSetupWizardProps {
  userId: string;
  onComplete?: () => Promise<void>;
}

const STEPS = [
  { id: "welcome", title: "Welcome", icon: Building2 },
  { id: "details", title: "Business Details", icon: Building2 },
  { id: "owner", title: "Owner Contact", icon: User },
  { id: "units", title: "Units", icon: Scale },
  { id: "quantities", title: "Quick Quantities", icon: Zap },
  { id: "privacy", title: "Privacy Settings", icon: Shield },
  { id: "roles", title: "Staff Roles", icon: Users },
  { id: "reasons", title: "Inventory Reasons", icon: ClipboardList },
  { id: "nicknames", title: "Nicknames", icon: Tag },
  { id: "review", title: "Review", icon: CheckCircle2 },
  { id: "complete", title: "Complete", icon: CheckCircle2 },
];

export function BusinessSetupWizard({
  userId,
  onComplete,
}: BusinessSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [formData, setFormData] = useState({
    // Business Details
    businessName: "",
    businessType: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",

    // Owner Contact
    ownerName: "",
    ownerPhone: "",

    // Units
    defaultUnit: "g", // 'g' or 'oz'

    // Quick Quantities (Default presets)
    quickQuantities: [
      { label: "1g", value: 1, unit: "g", enabled: true },
      { label: "3.5g", value: 3.5, unit: "g", enabled: true },
      { label: "7g", value: 7, unit: "g", enabled: true },
      { label: "14g", value: 14, unit: "g", enabled: true },
      { label: "28g", value: 28, unit: "g", enabled: true },
    ],

    // Privacy
    privacyPreset: "balanced", // open, balanced, private, max_secure

    // Staff Roles (active roles to create)
    enableManager: true,
    enableBudtender: true,
    enableInventoryStart: false,

    // Inventory Reasons (presets)
    inventoryReasons: [
      { label: "Restock", type: "positive", enabled: true },
      { label: "Sale", type: "negative", enabled: true },
      { label: "Waste", type: "negative", enabled: true },
      { label: "Theft", type: "negative", enabled: true },
      { label: "Gift", type: "negative", enabled: true },
      { label: "Correction", type: "neutral", enabled: true },
    ],

    // Nicknames
    nicknames: [
      { slang: "Dime", quantity: 1, unit: "g", enabled: false },
      { slang: "Dub", quantity: 2, unit: "g", enabled: false },
      { slang: "Eighth", quantity: 3.5, unit: "g", enabled: true },
      { slang: "Zip", quantity: 28, unit: "g", enabled: true },
    ],
  });

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinish = async () => {
    if (!supabase) {
      toast.error("Database connection failed");
      return;
    }
    setLoading(true);
    try {
      // 1. Create Business Profile
      const { data: business, error: businessError } = await supabase
        .from("business_profile")
        .insert({
          business_name: formData.businessName,
          business_type: formData.businessType,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          phone_number: formData.ownerPhone,
          owner_id: userId,
          is_active: true,
        })
        .select()
        .single();

      if (businessError) throw businessError;

      // 2. Create Business Settings with new attributes in JSONB
      const { error: settingsError } = await supabase
        .from("business_settings")
        .insert({
          business_id: business.id,
          currency: "USD",
          timezone: "America/New_York", // Default for now
          default_tax_rate: 0.0,
          settings_data: {
            onboarding_completed: true,
            default_unit: formData.defaultUnit,
            quick_quantities: formData.quickQuantities.filter((q) => q.enabled),
            privacy_preset: formData.privacyPreset,
            inventory_reasons: formData.inventoryReasons.filter(
              (r) => r.enabled,
            ),
            nicknames: formData.nicknames.filter((n) => n.enabled),
            owner_name: formData.ownerName,
          },
        });

      if (settingsError) throw settingsError;

      // 3. Assign Owner Role
      const { error: roleError } = await supabase.from("user_roles").insert({
        business_id: business.id,
        user_id: userId,
        role: "owner",
        permissions: { all: true },
      });

      if (roleError) throw roleError;

      // 4. Create other roles logic can be handled here or later
      // skipping actual user creation for other roles for now

      toast.success("Business setup complete!");

      if (onComplete) {
        await onComplete();
      } else {
        router.refresh(); // Fallback if no onComplete
      }
    } catch (error: any) {
      console.error("Setup error:", error);
      toast.error(error.message || "Failed to complete setup.");
    } finally {
      setLoading(false);
    }
  };

  const stepContent = () => {
    switch (STEPS[currentStep].id) {
      case "welcome":
        return (
          <div className="space-y-6 text-center py-10">
            <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto text-accent mb-6">
              <Building2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold">Welcome to DRX.</h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Let's get your shop running. This setup takes about 2 minutes and
              helps us configure your privacy, inventory, and checkout settings.
            </p>
          </div>
        );

      case "details":
        return (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Business Name</Label>
              <Input
                value={formData.businessName}
                onChange={(e) =>
                  setFormData({ ...formData, businessName: e.target.value })
                }
                placeholder="e.g. The Green Room"
              />
            </div>
            <div className="grid gap-2">
              <Label>Business Type</Label>
              <Select
                onValueChange={(v) =>
                  setFormData({ ...formData, businessType: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dispensary">Dispensary</SelectItem>
                  <SelectItem value="delivery">Delivery Service</SelectItem>
                  <SelectItem value="smoke_shop">Smoke Shop</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Address (Optional)</Label>
              <Input
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="123 Main St"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>State</Label>
                <Input
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        );

      case "owner":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              This information is used for account recovery and critical alerts
              only.
            </p>
            <div className="grid gap-2">
              <Label>Owner Name</Label>
              <Input
                value={formData.ownerName}
                onChange={(e) =>
                  setFormData({ ...formData, ownerName: e.target.value })
                }
                placeholder="Your full name"
              />
            </div>
            <div className="grid gap-2">
              <Label>Phone (For Login/Recovery)</Label>
              <Input
                value={formData.ownerPhone}
                onChange={(e) =>
                  setFormData({ ...formData, ownerPhone: e.target.value })
                }
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        );

      case "units":
        return (
          <div className="space-y-6">
            <Label className="text-lg">How do you primarily sell?</Label>
            <div className="grid grid-cols-2 gap-4">
              <div
                className={`border p-6 rounded-xl cursor-pointer transition-all ${formData.defaultUnit === "g" ? "border-accent bg-accent/5 ring-1 ring-accent" : "hover:border-foreground/50"}`}
                onClick={() => setFormData({ ...formData, defaultUnit: "g" })}
              >
                <div className="font-bold text-xl mb-2">Grams (g)</div>
                <p className="text-sm text-muted-foreground">
                  Standard for flower and solids.
                </p>
              </div>
              <div
                className={`border p-6 rounded-xl cursor-pointer transition-all ${formData.defaultUnit === "oz" ? "border-accent bg-accent/5 ring-1 ring-accent" : "hover:border-foreground/50"}`}
                onClick={() => setFormData({ ...formData, defaultUnit: "oz" })}
              >
                <div className="font-bold text-xl mb-2">Ounces (oz)</div>
                <p className="text-sm text-muted-foreground">
                  Standard for liquids or bulk.
                </p>
              </div>
            </div>
          </div>
        );

      case "quantities":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Label className="text-lg">Quick Quantities</Label>
              <span className="text-xs text-muted-foreground">
                Tap to toggle
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              These buttons will appear on your POS for one-tap additions.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {formData.quickQuantities.map((q, idx) => (
                <div
                  key={idx}
                  className={`border p-4 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${q.enabled ? "border-accent bg-accent/10 text-accent font-bold" : "opacity-50 grayscale"}`}
                  onClick={() => {
                    const newQs = [...formData.quickQuantities];
                    newQs[idx].enabled = !newQs[idx].enabled;
                    setFormData({ ...formData, quickQuantities: newQs });
                  }}
                >
                  <span className="text-xl">{q.label}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case "privacy":
        const presets = {
          open: { label: "OPEN", desc: "Full customer details visible." },
          balanced: {
            label: "BALANCED",
            desc: "Standard limits. Recommended.",
          },
          private: {
            label: "PRIVATE",
            desc: "Reduced info. No phone exports.",
          },
          max_secure: {
            label: "MAX SECURE",
            desc: "Minimal retention. Strict access.",
          },
        };
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <Label className="text-lg">Privacy Level</Label>
              <p className="text-sm text-muted-foreground">
                Control how much customer data is stored and who can see it.
              </p>
            </div>

            <div className="space-y-6">
              {(Object.keys(presets) as Array<keyof typeof presets>).map(
                (key) => (
                  <div
                    key={key}
                    className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${formData.privacyPreset === key ? "border-accent bg-accent/5" : ""}`}
                    onClick={() =>
                      setFormData({ ...formData, privacyPreset: key })
                    }
                  >
                    <div>
                      <div className="font-bold">{presets[key].label}</div>
                      <div className="text-sm text-muted-foreground">
                        {presets[key].desc}
                      </div>
                    </div>
                    {formData.privacyPreset === key && (
                      <CheckCircle2 className="text-accent" />
                    )}
                  </div>
                ),
              )}
            </div>
          </div>
        );

      case "roles":
        return (
          <div className="space-y-6">
            <Label className="text-lg">Staff Roles</Label>
            <p className="text-sm text-muted-foreground">
              Which roles do you need right now? You can invite people later.
            </p>
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border p-4 rounded-lg">
                <Checkbox
                  id="manager"
                  checked={formData.enableManager}
                  onCheckedChange={(c) =>
                    setFormData({ ...formData, enableManager: !!c })
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="manager"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Manager
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Can edit inventory and view reports.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 border p-4 rounded-lg">
                <Checkbox
                  id="budtender"
                  checked={formData.enableBudtender}
                  onCheckedChange={(c) =>
                    setFormData({ ...formData, enableBudtender: !!c })
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="budtender"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Budtender
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Can process sales and view limited inventory.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case "reasons":
        return (
          <div className="space-y-6">
            <Label className="text-lg">Inventory Audit Reasons</Label>
            <p className="text-sm text-muted-foreground">
              Standard reasons for stock adjustments.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {formData.inventoryReasons.map((r, idx) => (
                <div
                  key={idx}
                  className={`border p-3 rounded-lg flex items-center gap-2 cursor-pointer ${r.enabled ? "bg-secondary/50 border-secondary-foreground/20" : "opacity-50"}`}
                  onClick={() => {
                    const newReasons = [...formData.inventoryReasons];
                    newReasons[idx].enabled = !newReasons[idx].enabled;
                    setFormData({ ...formData, inventoryReasons: newReasons });
                  }}
                >
                  <Checkbox checked={r.enabled} className="mr-2" />
                  <span className="text-sm font-medium">{r.label}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case "nicknames":
        return (
          <div className="space-y-6">
            <Label className="text-lg">Product Nicknames (Aliases)</Label>
            <p className="text-sm text-muted-foreground">
              Enable common slang terms to map them to real quantities
              automatically.
            </p>
            <div className="space-y-3">
              {formData.nicknames.map((n, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between border p-4 rounded-xl cursor-pointer ${n.enabled ? "border-accent/50 bg-accent/5" : "opacity-60"}`}
                  onClick={() => {
                    const newNicks = [...formData.nicknames];
                    newNicks[idx].enabled = !newNicks[idx].enabled;
                    setFormData({ ...formData, nicknames: newNicks });
                  }}
                >
                  <div>
                    <div className="font-bold">"{n.slang}"</div>
                    <div className="text-xs text-muted-foreground">
                      Maps to {n.quantity}
                      {n.unit}
                    </div>
                  </div>
                  <div
                    className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${n.enabled ? "bg-accent justify-end" : "bg-muted justify-start"}`}
                  >
                    <div className="w-4 h-4 rounded-full bg-background" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "review":
        return (
          <div className="space-y-6 text-center py-6">
            <h3 className="text-2xl font-bold">Looks Good?</h3>
            <div className="space-y-4 text-left max-w-sm mx-auto bg-muted/20 p-6 rounded-xl border">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Business</span>
                <span className="font-medium">
                  {formData.businessName || "Untitled"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Privacy</span>
                <span className="font-medium uppercase">
                  {formData.privacyPreset}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Default Unit</span>
                <span className="font-medium">
                  {formData.defaultUnit === "g" ? "Grams" : "Ounces"}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Owner</span>
                <span className="font-medium">
                  {formData.ownerName || "Not set"}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              You can change these settings later in the admin panel.
            </p>
          </div>
        );

      case "complete":
        return null; // Handled by handleFinish
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-border/50 shadow-2xl relative overflow-hidden">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <CardHeader className="text-center pt-8">
          <div className="flex justify-center mb-2">
            {STEPS[currentStep].icon &&
              (() => {
                const Icon = STEPS[currentStep].icon;
                return <Icon className="w-6 h-6 text-muted-foreground" />;
              })()}
          </div>
          <CardTitle>{STEPS[currentStep].title}</CardTitle>
          {STEPS[currentStep].id === "details" && (
            <CardDescription>Basic info about your operation.</CardDescription>
          )}
        </CardHeader>

        <CardContent className="min-h-[300px]">{stepContent()}</CardContent>

        <CardFooter className="flex justify-between border-t pt-6 bg-muted/10">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0 || loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {currentStep === STEPS.length - 2 ? (
            <Button onClick={handleFinish} disabled={loading} className="px-8">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Finish Setup
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={loading} className="px-8">
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
