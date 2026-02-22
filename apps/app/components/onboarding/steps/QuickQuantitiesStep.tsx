import { Label } from "@/components/ui/label";
import { StepProps } from "../types";

export function QuickQuantitiesStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Label className="text-lg">Quick quantities</Label>
        <span className="text-xs text-muted-foreground">Tap to toggle</span>
      </div>
      <p className="text-sm text-muted-foreground">
        These show up in POS so your crew can add product fast.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {formData.quickQuantities.map((q, idx) => (
          <div
            key={idx}
            className={`border p-4 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${
              q.enabled
                ? "border-accent bg-accent/10 text-accent font-bold"
                : "opacity-50 grayscale"
            }`}
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
}
