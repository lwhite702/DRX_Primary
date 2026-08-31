import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { StepProps } from "../types";
import { PRIVACY_PROFILE_OPTIONS } from "@/lib/privacy/profiles";
import { drxCopy } from "@/lib/copy/drx";

const PROFILE_COPY = {
  alias_mode: drxCopy.onboarding.privacy.presets.aliasMode,
  standard_mode: drxCopy.onboarding.privacy.presets.standardMode,
  business_crm_mode: drxCopy.onboarding.privacy.presets.businessCrmMode,
} as const;

export function PrivacyStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Label className="text-lg">{drxCopy.onboarding.privacy.title}</Label>
        <p className="text-sm text-muted-foreground">
          {drxCopy.onboarding.privacy.body}
        </p>
      </div>

      <div className="space-y-6">
        {PRIVACY_PROFILE_OPTIONS.map((profile) => {
          const copy = PROFILE_COPY[profile.id];

          return (
            <div
              key={profile.id}
              className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                formData.privacyPreset === profile.id ? "border-accent bg-accent/5" : ""
              }`}
              onClick={() => setFormData({ ...formData, privacyPreset: profile.id })}
            >
              <div>
                <div className="font-bold">{copy.label}</div>
                <div className="text-sm text-muted-foreground">{copy.desc}</div>
              </div>
              {formData.privacyPreset === profile.id && (
                <CheckCircle2 className="text-accent" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
