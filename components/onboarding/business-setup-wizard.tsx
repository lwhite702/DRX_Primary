"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  LucideIcon,
} from "lucide-react";

import { WelcomeStep } from "./steps/WelcomeStep";
import { BusinessDetailsStep } from "./steps/BusinessDetailsStep";
import { OwnerContactStep } from "./steps/OwnerContactStep";
import { UnitsStep } from "./steps/UnitsStep";
import { QuickQuantitiesStep } from "./steps/QuickQuantitiesStep";
import { PrivacyStep } from "./steps/PrivacyStep";
import { RolesStep } from "./steps/RolesStep";
import { ReasonsStep } from "./steps/ReasonsStep";
import { NicknamesStep } from "./steps/NicknamesStep";
import { ReviewStep } from "./steps/ReviewStep";
import { BusinessSetupFormData } from "./types";

interface BusinessSetupWizardProps {
  userId: string;
  onComplete?: () => Promise<void>;
}

const STEPS: {
  id: string;
  title: string;
  icon: LucideIcon;
  component: React.ComponentType<any>;
}[] = [
  { id: "welcome", title: "Welcome", icon: Building2, component: WelcomeStep },
  {
    id: "details",
    title: "Business Details",
    icon: Building2,
    component: BusinessDetailsStep,
  },
  {
    id: "owner",
    title: "Owner Contact",
    icon: User,
    component: OwnerContactStep,
  },
  { id: "units", title: "Units", icon: Scale, component: UnitsStep },
  {
    id: "quantities",
    title: "Quick Quantities",
    icon: Zap,
    component: QuickQuantitiesStep,
  },
  {
    id: "privacy",
    title: "Privacy Settings",
    icon: Shield,
    component: PrivacyStep,
  },
  { id: "roles", title: "Staff Roles", icon: Users, component: RolesStep },
  {
    id: "reasons",
    title: "Inventory Reasons",
    icon: ClipboardList,
    component: ReasonsStep,
  },
  { id: "nicknames", title: "Nicknames", icon: Tag, component: NicknamesStep },
  { id: "review", title: "Review", icon: CheckCircle2, component: ReviewStep },
  {
    id: "complete",
    title: "Complete",
    icon: CheckCircle2,
    component: () => null,
  },
];

export function BusinessSetupWizard({
  userId,
  onComplete,
}: BusinessSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [formData, setFormData] = useState<BusinessSetupFormData>({
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

  const StepComponent = STEPS[currentStep].component;

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

        <CardContent className="min-h-[300px]">
          <StepComponent formData={formData} setFormData={setFormData} />
        </CardContent>

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
