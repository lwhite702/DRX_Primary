import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { StepProps } from "../types";

export function RolesStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-6">
      <Label className="text-lg">Staff roles</Label>
      <p className="text-sm text-muted-foreground">
        Pick who you need now. You can add people later.
      </p>
      <div className="space-y-4">
        <div className="flex items-center space-x-2 border p-4 rounded-lg">
          <Checkbox
            id="manager"
            checked={formData.enableManager}
            onCheckedChange={(c) =>
              setFormData({ ...formData, enableManager: !!c })
            }
          />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="manager"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Manager
            </label>
            <p className="text-sm text-muted-foreground">
              Handles inventory updates and reports.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 border p-4 rounded-lg">
          <Checkbox
            id="budtender"
            checked={formData.enableBudtender}
            onCheckedChange={(c) =>
              setFormData({ ...formData, enableBudtender: !!c })
            }
          />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="budtender"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Sales crew
            </label>
            <p className="text-sm text-muted-foreground">
              Runs checkout with limited inventory access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
