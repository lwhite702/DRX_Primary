import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { StepProps } from "../types";

export function ReasonsStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-6">
      <Label className="text-lg">Inventory reasons</Label>
      <p className="text-sm text-muted-foreground">
        Keep these tags so your audit trail stays clean.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {formData.inventoryReasons.map((r, idx) => (
          <div
            key={idx}
            className={`border p-3 rounded-lg flex items-center gap-2 cursor-pointer ${
              r.enabled
                ? "bg-secondary/50 border-secondary-foreground/20"
                : "opacity-50"
            }`}
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
}
