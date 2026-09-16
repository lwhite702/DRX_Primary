import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { StepProps } from "../types";

export function RolesStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-6">
      <Label className="text-lg">Staff roles</Label>
      <p className="text-sm text-muted-foreground">
        Pick who you need now. You can add people later.
      </p>
      <div className="space-y-4">
        <div className="space-y-3 border p-4 rounded-lg">
          <div className="flex items-center space-x-2">
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
                Handles inventory updates, overrides, and reports.
              </p>
            </div>
          </div>
          {formData.enableManager && (
            <div className="pt-2 pl-6 space-y-1.5 border-t border-border/50">
              <Label htmlFor="manager-pin" className="text-xs font-medium">
                Manager PIN (4–6 digits)
              </Label>
              <Input
                id="manager-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="4–6 digits"
                value={formData.managerPin || ""}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "");
                  setFormData({ ...formData, managerPin: cleaned });
                }}
                className="w-36 font-mono text-sm tracking-widest"
              />
              <p className="text-xs text-muted-foreground">
                Used to authorize sensitive actions like below-cost price overrides.
              </p>
            </div>
          )}
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
