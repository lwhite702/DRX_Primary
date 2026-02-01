import { Label } from "@/components/ui/label";
import { StepProps } from "../types";

export function UnitsStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-6">
      <Label className="text-lg">How do you primarily sell?</Label>
      <div className="grid grid-cols-2 gap-4">
        <div
          className={`border p-6 rounded-xl cursor-pointer transition-all ${
            formData.defaultUnit === "g"
              ? "border-accent bg-accent/5 ring-1 ring-accent"
              : "hover:border-foreground/50"
          }`}
          onClick={() => setFormData({ ...formData, defaultUnit: "g" })}
        >
          <div className="font-bold text-xl mb-2">Grams (g)</div>
          <p className="text-sm text-muted-foreground">
            Standard for flower and solids.
          </p>
        </div>
        <div
          className={`border p-6 rounded-xl cursor-pointer transition-all ${
            formData.defaultUnit === "oz"
              ? "border-accent bg-accent/5 ring-1 ring-accent"
              : "hover:border-foreground/50"
          }`}
          onClick={() => setFormData({ ...formData, defaultUnit: "oz" })}
        >
          <div className="font-bold text-xl mb-2">Ounces (oz)</div>
          <p className="text-sm text-muted-foreground">
            Standard for liquids or bulk.
          </p>
        </div>
      </div>
    </div>
  );
}
