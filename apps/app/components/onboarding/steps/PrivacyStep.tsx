import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { StepProps } from "../types";
import { drxCopy } from "@/lib/copy/drx";

const PRIVACY_PRESETS: Record<string, { label: string; desc: string }> = {
  open: drxCopy.onboarding.privacy.presets.open,
  balanced: drxCopy.onboarding.privacy.presets.balanced,
  private: drxCopy.onboarding.privacy.presets.private,
  max_secure: drxCopy.onboarding.privacy.presets.maxSecure,
};

export function PrivacyStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Label className="text-lg">{drxCopy.onboarding.privacy.title}</Label>
        <p className="text-sm text-muted-foreground">{drxCopy.onboarding.privacy.body}</p>
      </div>

      <div className="space-y-6">
        {(
          Object.keys(PRIVACY_PRESETS) as Array<keyof typeof PRIVACY_PRESETS>
        ).map((key) => (
          <div
            key={key}
            className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
              formData.privacyPreset === key ? "border-accent bg-accent/5" : ""
            }`}
            onClick={() => setFormData({ ...formData, privacyPreset: key })}
          >
            <div>
              <div className="font-bold">{PRIVACY_PRESETS[key].label}</div>
              <div className="text-sm text-muted-foreground">{PRIVACY_PRESETS[key].desc}</div>
            </div>
            {formData.privacyPreset === key && (
              <CheckCircle2 className="text-accent" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
