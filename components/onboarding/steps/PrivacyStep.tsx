import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { StepProps } from "../types";

const PRIVACY_PRESETS: Record<string, { label: string; desc: string }> = {
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

export function PrivacyStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Label className="text-lg">Privacy Level</Label>
        <p className="text-sm text-muted-foreground">
          Control how much customer data is stored and who can see it.
        </p>
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
              <div className="text-sm text-muted-foreground">
                {PRIVACY_PRESETS[key].desc}
              </div>
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
