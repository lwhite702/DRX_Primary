import { Label } from "@/components/ui/label";
import { StepProps } from "../types";

export function NicknamesStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-6">
      <Label className="text-lg">Product Nicknames (Aliases)</Label>
      <p className="text-sm text-muted-foreground">
        Enable common slang terms to map them to real quantities automatically.
      </p>
      <div className="space-y-3">
        {formData.nicknames.map((n, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between border p-4 rounded-xl cursor-pointer ${
              n.enabled ? "border-accent/50 bg-accent/5" : "opacity-60"
            }`}
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
              className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${
                n.enabled ? "bg-accent justify-end" : "bg-muted justify-start"
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-background" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
