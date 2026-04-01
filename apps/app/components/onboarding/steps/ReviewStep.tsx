import { StepProps } from "../types";
import { PRIVACY_PROFILE_OPTIONS } from "@/lib/privacy/profiles";

export function ReviewStep({ formData }: StepProps) {
  const privacyLabel =
    PRIVACY_PROFILE_OPTIONS.find(
      (option) => option.id === formData.privacyPreset,
    )?.label || formData.privacyPreset;

  return (
    <div className="space-y-6 text-center py-6">
      <h3 className="text-2xl font-bold">Ready to roll?</h3>
      <div className="space-y-4 text-left max-w-sm mx-auto bg-muted/20 p-6 rounded-xl border">
        <div className="flex justify-between py-2 border-b">
          <span className="text-muted-foreground">Business</span>
          <span className="font-medium">
            {formData.businessName || "Untitled"}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b">
          <span className="text-muted-foreground">Privacy</span>
          <span className="font-medium uppercase">{privacyLabel}</span>
        </div>
        <div className="flex justify-between py-2 border-b">
          <span className="text-muted-foreground">Default unit</span>
          <span className="font-medium">
            {formData.defaultUnit === "g" ? "Grams" : "Ounces"}
          </span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-muted-foreground">Owner</span>
          <span className="font-medium">{formData.ownerName || "Not set"}</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        You can edit all of this later in settings.
      </p>
    </div>
  );
}
