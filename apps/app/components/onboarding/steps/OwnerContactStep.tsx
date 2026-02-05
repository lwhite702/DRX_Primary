import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { StepProps } from "../types";

export function OwnerContactStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-4">
        This information is used for account recovery and critical alerts only.
      </p>
      <div className="grid gap-2">
        <Label>Owner Name</Label>
        <Input
          value={formData.ownerName}
          onChange={(e) =>
            setFormData({ ...formData, ownerName: e.target.value })
          }
          placeholder="Your full name"
        />
      </div>
      <div className="grid gap-2">
        <Label>Phone (For Login/Recovery)</Label>
        <Input
          value={formData.ownerPhone}
          onChange={(e) =>
            setFormData({ ...formData, ownerPhone: e.target.value })
          }
          placeholder="(555) 123-4567"
        />
      </div>
    </div>
  );
}
