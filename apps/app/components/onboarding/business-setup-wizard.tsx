"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setupBusinessAction } from "@/app/actions/setup-business";
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
import { drxCopy } from "@/lib/copy/drx";

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
  {
    id: "welcome",
    title: drxCopy.onboarding.wizard.steps.welcome,
    icon: Building2,
    component: WelcomeStep,
  },
  {
    id: "details",
    title: drxCopy.onboarding.wizard.steps.details,
    icon: Building2,
    component: BusinessDetailsStep,
  },
  {
    id: "owner",
    title: drxCopy.onboarding.wizard.steps.owner,
    icon: User,
    component: OwnerContactStep,
  },
  {
    id: "units",
    title: drxCopy.onboarding.wizard.steps.units,
    icon: Scale,
    component: UnitsStep,
  },
  {
    id: "quantities",
    title: drxCopy.onboarding.wizard.steps.quantities,
    icon: Zap,
    component: QuickQuantitiesStep,
  },
  {
    id: "privacy",
    title: drxCopy.onboarding.wizard.steps.privacy,
    icon: Shield,
    component: PrivacyStep,
  },
  {
    id: "roles",
    title: drxCopy.onboarding.wizard.steps.roles,
    icon: Users,
    component: RolesStep,
  },
  {
    id: "reasons",
    title: drxCopy.onboarding.wizard.steps.reasons,
    icon: ClipboardList,
    component: ReasonsStep,
  },
  {
    id: "nicknames",
    title: drxCopy.onboarding.wizard.steps.nicknames,
    icon: Tag,
    component: NicknamesStep,
  },
  {
    id: "review",
    title: drxCopy.onboarding.wizard.steps.review,
    icon: CheckCircle2,
    component: ReviewStep,
  },
  {
    id: "complete",
    title: drxCopy.onboarding.wizard.steps.complete,
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
    privacyPreset: "standard_mode",

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
    setLoading(true);
    try {
      const { success, error } = await setupBusinessAction({
        businessName: formData.businessName,
        businessType: formData.businessType,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        ownerPhone: formData.ownerPhone,
        defaultUnit: formData.defaultUnit,
        quickQuantities: formData.quickQuantities.filter((q) => q.enabled),
        privacyPreset: formData.privacyPreset,
        inventoryReasons: formData.inventoryReasons.filter((r) => r.enabled),
        nicknames: formData.nicknames.filter((n) => n.enabled),
        ownerName: formData.ownerName,
      });

      if (error) throw new Error(error);

      toast.success(drxCopy.onboarding.wizard.setupComplete);

      if (onComplete) {
        await onComplete();
      } else {
        router.refresh();
      }
    } catch (error: any) {
      console.error("Setup error:", error);
      toast.error(error.message || drxCopy.onboarding.wizard.setupFailed);
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
            <CardDescription>
              {drxCopy.onboarding.wizard.detailsDescription}
            </CardDescription>
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
            {drxCopy.common.back}
          </Button>

          {currentStep === STEPS.length - 2 ? (
            <Button onClick={handleFinish} disabled={loading} className="px-8">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              {drxCopy.onboarding.wizard.finish}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={loading} className="px-8">
              {drxCopy.common.next}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
