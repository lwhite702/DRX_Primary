import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StepProps } from "../types";

export function BusinessDetailsStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>Business Name</Label>
        <Input
          value={formData.businessName}
          onChange={(e) =>
            setFormData({ ...formData, businessName: e.target.value })
          }
          placeholder="e.g. The Green Room"
        />
      </div>
      <div className="grid gap-2">
        <Label>Business Type</Label>
        <Select
          value={formData.businessType}
          onValueChange={(v) => setFormData({ ...formData, businessType: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dispensary">Dispensary</SelectItem>
            <SelectItem value="delivery">Delivery Service</SelectItem>
            <SelectItem value="smoke_shop">Smoke Shop</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Address (Optional)</Label>
        <Input
          value={formData.address}
          onChange={(e) =>
            setFormData({ ...formData, address: e.target.value })
          }
          placeholder="123 Main St"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>City</Label>
          <Input
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label>State</Label>
          <Input
            value={formData.state}
            onChange={(e) =>
              setFormData({ ...formData, state: e.target.value })
            }
          />
        </div>
      </div>
    </div>
  );
}
