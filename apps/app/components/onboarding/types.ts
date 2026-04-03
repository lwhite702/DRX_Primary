import type { PrivacyProfile } from "@/lib/privacy/types";

export interface QuickQuantity {
  label: string;
  value: number;
  unit: string;
  enabled: boolean;
}

export interface InventoryReason {
  label: string;
  type: string;
  enabled: boolean;
}

export interface Nickname {
  slang: string;
  quantity: number;
  unit: string;
  enabled: boolean;
}

export interface BusinessSetupFormData {
  // Business Details
  businessName: string;
  businessType: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;

  // Owner Contact
  ownerName: string;
  ownerPhone: string;

  // Units
  defaultUnit: string;

  // Quick Quantities
  quickQuantities: QuickQuantity[];

  // Privacy
  privacyPreset: PrivacyProfile;

  // Staff Roles
  enableManager: boolean;
  enableBudtender: boolean;
  enableInventoryStart: boolean;

  // Inventory Reasons
  inventoryReasons: InventoryReason[];

  // Nicknames
  nicknames: Nickname[];
}

export interface StepProps {
  formData: BusinessSetupFormData;
  setFormData: (data: BusinessSetupFormData) => void;
}
