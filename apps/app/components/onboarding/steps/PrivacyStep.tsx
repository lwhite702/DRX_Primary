import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { StepProps } from "../types";
import { PRIVACY_PROFILE_OPTIONS } from "@/lib/privacy/profiles";
import { drxCopy } from "@/lib/copy/drx";

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
        {PRIVACY_PROFILE_OPTIONS.map((profile) => (
          <div
            key={profile.id}
            className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
              formData.privacyPreset === profile.id ? "border-accent bg-accent/5" : ""
            }`}
            onClick={() => setFormData({ ...formData, privacyPreset: profile.id })}
          >
            <div>
              <div className="font-bold">{profile.label}</div>
              <div className="text-sm text-muted-foreground">{profile.description}</div>
            </div>
            {formData.privacyPreset === profile.id && (
              <CheckCircle2 className="text-accent" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
