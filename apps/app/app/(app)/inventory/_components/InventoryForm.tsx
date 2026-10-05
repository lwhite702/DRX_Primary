import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inventorySchema, type Inventory } from "@/lib/validations/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { ProgressiveSection } from "@/components/ui/progressive-section";
import { getUnitForCategory } from "@/lib/utils/units";
import { FractionalProductFields } from "@/components/inventory/fractional-product-fields";
import {
  commerceIssue,
  creationCommerceDefaults,
  guidedCommerceProfile,
} from "@/lib/commerce/product-creation";
import { calculatePurchaseUnitCost } from "@/lib/commerce/purchase-cost";
import { type DRXUnit } from "@/lib/units/convert";

import { StepperInput } from "@/components/ui/stepper-input";

interface InventoryFormProps {
  initialData?: Inventory | null;
  businessId: string;
  onSuccess: (data: Inventory) => Promise<string | void>;
  onCancel: () => void;
  onArchive?: (item: Inventory) => Promise<void> | void;
  onReactivate?: (item: Inventory) => Promise<void> | void;
  isFirstProduct?: boolean;
}

const CATEGORIES_LIST = [
  "Flower",
  "Edible",
  "Concentrate",
  "Pre-roll",
  "Vape",
  "Tincture",
  "Topical",
  "Accessory",
  "Beverage",
  "Pills", // copy-lint-disable
  "Crystals",
  "Powder",
];

export function InventoryForm({
  initialData,
  businessId,
  onSuccess,
  onCancel,
  onArchive,
  onReactivate,
  isFirstProduct = false,
}: InventoryFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<Inventory>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      business_id: businessId,
      quantity_on_hand: 0,
      reorder_level: 10,
      unit_of_measure: "g", // Default
      category: initialData?.category || "Flower",
      is_taxable: initialData?.is_taxable ?? true,
      location: initialData?.location ?? "",
      ...initialData,
      ...(!initialData?.id
        ? {
            commerce_config: creationCommerceDefaults(
              initialData?.unit_of_measure || "g",
            ),
          }
        : {}),
    },
  });

  const isGuided = isFirstProduct && !initialData?.id;
  const [wizardStep, setWizardStep] = React.useState(0);
  const [manualSku, setManualSku] = React.useState(Boolean(initialData?.id || initialData?.sku));
  const [purchaseCostInput, setPurchaseCostInput] = React.useState("");

  const handleNext = async () => {
    let fieldsToValidate: (keyof Inventory)[] = [];
    if (wizardStep === 0) {
      fieldsToValidate = ["product_name"];
    } else if (wizardStep === 1) {
      fieldsToValidate = ["quantity_on_hand", "reorder_level"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid && wizardStep === 0 && manualSku && !watch("sku").trim()) {
      setError("sku", { message: "Enter a SKU or choose automatic generation" });
      return;
    }
    if (isValid) {
      setWizardStep((prev) => prev + 1);
    }
  };

  const [selectedCategoryType, setSelectedCategoryType] =
    React.useState<string>(() => {
      if (!initialData?.category) return "Flower";
      return CATEGORIES_LIST.includes(initialData.category)
        ? initialData.category
        : "Other";
    });

  // Watch category changes to auto-set unit
  const category = watch("category");
  const unitCost = watch("unit_cost");
  const sellingPrice = watch("selling_price");
  const isTaxable = watch("is_taxable");
  const commerceConfig = watch("commerce_config");
  const purchaseBasis = watch("purchase_cost_basis");
  const sellingUnit = (commerceConfig?.sellingUnit || watch("unit_of_measure") || "g") as DRXUnit;
  let calculatedCost: ReturnType<typeof calculatePurchaseUnitCost> | undefined;
  let purchaseError: string | undefined;
  if (purchaseBasis) {
    try {
      calculatedCost = calculatePurchaseUnitCost(purchaseBasis, sellingUnit);
    } catch (error) {
      purchaseError = error instanceof Error ? error.message : "Check the purchase details";
    }
    if (!purchaseCostInput) purchaseError = "Enter the package purchase price";
    if (purchaseCostInput && Math.abs(Number(purchaseCostInput) * 100 - Math.round(Number(purchaseCostInput) * 100)) > 1e-6) {
      purchaseError = "Purchase price may use at most two decimal places";
    }
  }
  const invalidCommerce =
    commerceConfig &&
    Boolean(commerceIssue(commerceConfig, typeof sellingPrice === "number" ? sellingPrice : undefined));

  // Calculate margins in real time
  const cost = calculatedCost ? calculatedCost.unitCostCentsExact / 100 :
    typeof unitCost === "number" && !isNaN(unitCost) ? unitCost : 0;
  const price =
    typeof sellingPrice === "number" && !isNaN(sellingPrice) ? sellingPrice : 0;
  const profit = price - cost;
  const marginPercentage = price > 0 ? (profit / price) * 100 : 0;
  const markupPercentage = cost > 0 ? (profit / cost) * 100 : 0;
  const userSelectedUnit = React.useRef(false);

  const skuFields = (
    <div className="space-y-2">
      <Label>SKU</Label>
      {!initialData?.id && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="SKU choice">
          <Button type="button" variant={!manualSku ? "default" : "outline"} onClick={() => {
            setManualSku(false); setValue("sku", "", { shouldDirty: true });
          }}>Generate SKU</Button>
          <Button type="button" variant={manualSku ? "default" : "outline"} onClick={() => setManualSku(true)}>Enter my own</Button>
        </div>
      )}
      {manualSku ? <Input id="sku" aria-label="SKU" placeholder="e.g. FLOWER-01" {...register("sku")} /> :
        <p className="text-sm text-muted-foreground">DRX will create a unique SKU when you save.</p>}
      {errors.sku && <p role="alert" className="text-sm text-destructive">{errors.sku.message}</p>}
      {!initialData?.id && <div className="space-y-1">
        <Label htmlFor="barcode">Barcode (optional)</Label>
        <Input id="barcode" placeholder="Scanner code, if different from SKU" {...register("barcode")} />
      </div>}
    </div>
  );

  const purchaseFields = !initialData?.id && (
    <div className="space-y-3 rounded-lg border border-white/10 p-3">
      <div className="flex items-center justify-between gap-3">
        <div><Label htmlFor="purchase-basis">I buy this in a different unit</Label>
          <p className="text-xs text-muted-foreground">Enter what you paid for the package; DRX calculates cost per {sellingUnit}.</p></div>
        <Switch id="purchase-basis" checked={Boolean(purchaseBasis)} onCheckedChange={(enabled) => {
          setPurchaseCostInput("");
          setValue("purchase_cost_basis", enabled ? { costCents: 0, quantity: 1, unit: sellingUnit } : undefined, { shouldDirty: true });
        }} />
      </div>
      {purchaseBasis && <>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><Label htmlFor="purchase-cost">Purchase price ($)</Label><Input id="purchase-cost" type="number" min="0" step="0.01" defaultValue="" onChange={(event) => {
            setPurchaseCostInput(event.target.value);
            setValue("purchase_cost_basis.costCents", Math.round(Number(event.target.value) * 100), { shouldDirty: true, shouldValidate: true });
          }} /></div>
          <div><Label htmlFor="purchase-quantity">Package quantity</Label><Input id="purchase-quantity" type="number" min="0" step="any" defaultValue="1" onChange={(event) => setValue("purchase_cost_basis.quantity", Number(event.target.value), { shouldDirty: true, shouldValidate: true })} /></div>
          <div><Label htmlFor="purchase-unit">Purchase unit</Label><select id="purchase-unit" className="h-10 w-full rounded-md border border-white/20 bg-[#222] px-2" value={purchaseBasis.unit} onChange={(event) => setValue("purchase_cost_basis.unit", event.target.value as DRXUnit, { shouldDirty: true, shouldValidate: true })}>
            {(["g", "oz", "lb", "kg", "ml", "L", "fl_oz", "unit"] as const).map((unit) => <option key={unit} value={unit}>{unit}</option>)}
          </select></div>
        </div>
        <div><Label htmlFor="actual-net">Actual net amount in {sellingUnit} (optional)</Label><Input id="actual-net" type="number" min="0" step="any" placeholder="Use if supplier weight differs from the label" defaultValue="" onChange={(event) => setValue("purchase_cost_basis.actualSellingQuantity", event.target.value ? Number(event.target.value) : undefined, { shouldDirty: true, shouldValidate: true })} /></div>
        {calculatedCost && <p className="text-sm text-accent">{purchaseBasis.quantity} {purchaseBasis.unit} costs ${(purchaseBasis.costCents / 100).toFixed(2)} → {calculatedCost.sellingQuantity.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")} {sellingUnit} → ${cost.toFixed(2)} per {sellingUnit} (display estimate; exact cost retained)</p>}
        {purchaseError && <p role="alert" className="text-sm text-destructive">{purchaseError}</p>}
      </>}
    </div>
  );

  // Auto-set unit based on category only if operator hasn't explicitly chosen a unit
  React.useEffect(() => {
    const isExistingItem =
      initialData &&
      "id" in initialData &&
      !!(initialData as { id?: string }).id;

    if (category && !isExistingItem && !userSelectedUnit.current) {
      const unit = getUnitForCategory(category);
      setValue("unit_of_measure", unit);
      if (commerceConfig) setValue("commerce_config.sellingUnit", unit);
    }
  }, [category, initialData, setValue, commerceConfig]);

  return (
    <form noValidate onSubmit={handleSubmit((data) => {
      if (manualSku && !data.sku.trim()) {
        setError("sku", { message: "Enter a SKU or choose automatic generation" });
        return;
      }
      if (data.purchase_cost_basis && (!calculatedCost || purchaseError)) return;
      if (data.commerce_config && commerceIssue(data.commerce_config, data.selling_price)) return;
      return onSuccess(data);
    })} className="space-y-6 text-left">
      {/* Wizard Step Progress Tracker */}
      {isGuided && (
        <div className="mb-6 p-4 rounded-xl border border-white/10 bg-black/20">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Step {wizardStep + 1} of 3</span>
            <span className="font-semibold text-accent uppercase tracking-wider">
              {wizardStep === 0
                ? "Product Identity"
                : wizardStep === 1
                  ? "Stock & Thresholds"
                  : "Pricing & Fractional Sales"}
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${((wizardStep + 1) / 3) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* GUIDED MODE - STEP 0: Product Identity */}
      {isGuided && wizardStep === 0 && (
        <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Product Identity
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skuFields}
            <div className="space-y-2">
              <Label htmlFor="product_name" className="flex items-center gap-1">
                Product Name *
                <HelpTooltip content="The user-facing name of the product that shows up on customer receipts and menus." />
              </Label>
              <Input
                id="product_name"
                placeholder="e.g. Blue Dream Flower"
                className="bg-black/50 border-white/10"
                {...register("product_name")}
              />
              {errors.product_name && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.product_name.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="flex items-center gap-1">
                Category
                <HelpTooltip content="Categories map products to correct tax rates and measuring types (e.g. solids vs liquids)." />
              </Label>
              <select
                id="category"
                value={selectedCategoryType}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCategoryType(val);
                  if (val !== "Other") {
                    setValue("category", val);
                  } else {
                    setValue("category", "");
                  }
                }}
                className="h-11 w-full rounded-lg border border-white/30 bg-[#222] px-3.5 py-2 text-base text-white shadow-xs outline-none transition-colors hover:border-white/50 focus:border-accent focus:ring-2 focus:ring-accent/40 md:text-sm"
              >
                {CATEGORIES_LIST.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="Other">Other (Custom)...</option>
              </select>

              {selectedCategoryType === "Other" && (
                <Input
                  id="category"
                  placeholder="Enter custom category name"
                  className="bg-black/50 border-white/10 mt-2"
                  {...register("category")}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-1">
                Description
                <HelpTooltip content="Optional detailed notes about strain information, sourcing details, or product specs." />
              </Label>
              <Input
                id="description"
                placeholder="e.g. Sativa-dominant hybrid strain"
                className="bg-black/50 border-white/10"
                {...register("description")}
              />
            </div>
          </div>
        </div>
      )}

      {/* GUIDED MODE - STEP 1: Stock & Thresholds */}
      {isGuided && wizardStep === 1 && (
        <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Stock & Thresholds
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="quantity_on_hand"
                className="flex items-center gap-1 text-white font-medium"
              >
                Initial Stock Count ({commerceConfig?.sellingUnit || watch("unit_of_measure") || "units"}) *
                <HelpTooltip content="The current physical amount in stock. Measured in your chosen selling unit." />
              </Label>
              <StepperInput
                id="quantity_on_hand"
                min={0}
                step={1}
                unit={commerceConfig?.sellingUnit || watch("unit_of_measure") || "units"}
                value={watch("quantity_on_hand")}
                onChange={(val) => setValue("quantity_on_hand", val, { shouldValidate: true })}
                aria-label="Initial stock count"
              />
              {errors.quantity_on_hand && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.quantity_on_hand.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="reorder_level"
                className="flex items-center gap-1 text-white font-medium"
              >
                Low Stock Alert Level *
                <HelpTooltip content="We'll notify you on the dashboard when inventory drops to or below this number." />
              </Label>
              <StepperInput
                id="reorder_level"
                min={0}
                step={5}
                unit={commerceConfig?.sellingUnit || watch("unit_of_measure") || "units"}
                value={watch("reorder_level")}
                onChange={(val) => setValue("reorder_level", val, { shouldValidate: true })}
                aria-label="Low stock alert level"
              />
              {errors.reorder_level && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.reorder_level.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-1">
              Storage Location
              <HelpTooltip content="Physical location in your store or warehouse (e.g. Shelf A-3, Vault, Backroom)." />
            </Label>
            <Input
              id="location"
              placeholder="e.g. Shelf A-3, Vault"
              className="bg-black/50 border-white/10"
              {...register("location")}
            />
          </div>
        </div>
      )}

      {/* GUIDED MODE - STEP 2: Pricing Strategy */}
      {isGuided && wizardStep === 2 && (
        <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pricing Strategy
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit_cost" className="flex items-center gap-1 text-white font-medium">
                Cost per {sellingUnit} ($)
                <HelpTooltip content={`What you paid per ${commerceConfig?.sellingUnit || watch("unit_of_measure") || "unit"}. DRX uses this to calculate profit.`} />
              </Label>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                placeholder="0.00"
                disabled={Boolean(purchaseBasis)}
                value={purchaseBasis ? (calculatedCost ? (cost).toFixed(2) : "") : undefined}
                className="bg-black/50 border-white/10"
                {...register("unit_cost", { valueAsNumber: true })}
              />
              {errors.unit_cost && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.unit_cost.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="selling_price"
                className="flex items-center gap-1 text-white font-medium"
              >
                Retail Price ($) *
                <HelpTooltip content={`The base retail price customers pay per ${commerceConfig?.sellingUnit || watch("unit_of_measure") || "unit"} at checkout.`} />
              </Label>
              <Input
                id="selling_price"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="bg-black/50 border-accent/30 focus:border-accent"
                {...register("selling_price", { valueAsNumber: true })}
              />
              {errors.selling_price && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.selling_price.message}
                </p>
              )}
            </div>
          </div>

          {purchaseFields}

          {!initialData?.id && commerceConfig && (
            <>
              <FractionalProductFields
                value={commerceConfig}
                basePrice={price}
                onChange={(config) => {
                  userSelectedUnit.current = true;
                  setValue("commerce_config", config, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                  setValue(
                    "unit_of_measure",
                    config.sellingUnit as Inventory["unit_of_measure"],
                  );
                }}
              />
              {(errors.commerce_config || invalidCommerce) && (
                <p role="alert" className="text-sm text-destructive">
                  {commerceIssue(commerceConfig, price) || "Check the selling rules."}
                </p>
              )}
              {invalidCommerce && <Button type="button" variant="outline" onClick={() => setValue("commerce_config", guidedCommerceProfile(commerceConfig.sellingUnit, commerceConfig.fractionalEnabled), { shouldDirty: true, shouldValidate: true })}>Use recommended selling rules</Button>}
            </>
          )}

          {/* Dynamic Margin Calculator Widget */}
          <div className="mt-4 p-3 bg-black/60 rounded-lg border border-white/5 space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground font-mono">
              <span>Profit Margin Calculator</span>
              <span className="text-[10px] text-accent/80 font-sans uppercase">
                Live Feedback
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2 rounded bg-white/5">
                <p className="text-[10px] text-muted-foreground uppercase">
                  Net profit
                </p>
                <p
                  className={`text-sm font-semibold font-mono ${profit >= 0 ? "text-emerald-400" : "text-destructive"}`}
                >
                  ${profit.toFixed(2)}
                </p>
              </div>
              <div className="p-2 rounded bg-white/5">
                <p className="text-[10px] text-muted-foreground uppercase">
                  Markup
                </p>
                <p
                  className={`text-sm font-semibold font-mono ${markupPercentage >= 0 ? "text-accent" : "text-destructive"}`}
                >
                  {markupPercentage.toFixed(1)}%
                </p>
              </div>
              <div className="p-2 rounded bg-white/5">
                <p className="text-[10px] text-muted-foreground uppercase">
                  Gross Margin
                </p>
                <p
                  className={`text-sm font-semibold font-mono ${marginPercentage >= 0 ? "text-emerald-400" : "text-destructive"}`}
                >
                  {marginPercentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STANDARD (NON-GUIDED) FORM: Primary essential fields + Progressive reveal */}
      {!isGuided && (
        <>
          {/* PRIMARY SECTION: Core Identity & Core Numbers */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Primary Details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product_name" className="flex items-center gap-1">
                  Product Name *
                  <HelpTooltip content="The user-facing name that shows up on customer receipts, quick menus, and reports." />
                </Label>
                <Input
                  id="product_name"
                  placeholder="e.g. Blue Dream Flower"
                  className="bg-black/50 border-white/10"
                  {...register("product_name")}
                />
                {errors.product_name && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.product_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="flex items-center gap-1 text-white font-medium">
                  Category
                  <HelpTooltip content="Categories map products to correct tax rates and measuring units." />
                </Label>
                <select
                  id="category"
                  value={selectedCategoryType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedCategoryType(val);
                    if (val !== "Other") {
                      setValue("category", val);
                    } else {
                      setValue("category", "");
                    }
                  }}
                  className="h-11 w-full rounded-lg border border-white/30 bg-[#222] px-3.5 py-2 text-base text-white shadow-xs outline-none transition-colors hover:border-white/50 focus:border-accent focus:ring-2 focus:ring-accent/40 md:text-sm"
                >
                  {CATEGORIES_LIST.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="Other">Other (Custom)...</option>
                </select>

                {selectedCategoryType === "Other" && (
                  <Input
                    id="category"
                    placeholder="Enter custom category name"
                    className="bg-black/50 border-white/10 mt-2"
                    {...register("category")}
                  />
                )}
              </div>
            </div>

            {skuFields}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="selling_price" className="flex items-center gap-1 text-white font-medium">
                  Retail Price ($) *
                  <HelpTooltip content={`The base retail price customers pay per ${commerceConfig?.sellingUnit || watch("unit_of_measure") || "unit"} at checkout.`} />
                </Label>
                <Input
                  id="selling_price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="bg-black/50 border-accent/30 focus:border-accent"
                  {...register("selling_price", { valueAsNumber: true })}
                />
                {errors.selling_price && (
                  <p role="alert" className="text-sm text-destructive">
                    {errors.selling_price.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_cost" className="flex items-center gap-1 text-white font-medium">
                  Cost per {sellingUnit} ($)
                  <HelpTooltip content={`What you paid per ${commerceConfig?.sellingUnit || watch("unit_of_measure") || "unit"}. DRX uses this to calculate profit.`} />
                </Label>
                <Input
                  id="unit_cost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  disabled={Boolean(purchaseBasis)}
                  value={purchaseBasis ? (calculatedCost ? cost.toFixed(2) : "") : undefined}
                  className="bg-black/50 border-white/10"
                  {...register("unit_cost", { valueAsNumber: true })}
                />
                {errors.unit_cost && (
                  <p role="alert" className="text-sm text-destructive">
                    {errors.unit_cost.message}
                  </p>
                )}
              </div>
            </div>

            {purchaseFields}

            <div className="space-y-2">
              <Label htmlFor="quantity_on_hand" className="flex items-center gap-1 text-white font-medium">
                Current Stock ({commerceConfig?.sellingUnit || watch("unit_of_measure") || "units"}) *
                <HelpTooltip content="The current physical amount on hand." />
              </Label>
              <StepperInput
                id="quantity_on_hand"
                min={0}
                step={1}
                unit={commerceConfig?.sellingUnit || watch("unit_of_measure") || "units"}
                value={watch("quantity_on_hand")}
                onChange={(val) => setValue("quantity_on_hand", val, { shouldValidate: true })}
                aria-label="Current stock count"
              />
              {errors.quantity_on_hand && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.quantity_on_hand.message}
                </p>
              )}
            </div>
          </div>

          {/* PROGRESSIVE DISCLOSURE: Additional / Advanced Options */}
          <ProgressiveSection
            title="Additional Details & Advanced Rules"
            description="Location, tax, reorder alerts, notes, selling rules"
            defaultOpen={false}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-1">
                  Storage Location
                  <HelpTooltip content="Shelf, safe, drawer, or room where this product is kept." />
                </Label>
                <Input
                  id="location"
                  placeholder="e.g. Shelf A-3, Vault"
                  className="bg-black/50 border-white/10"
                  {...register("location")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reorder_level" className="flex items-center gap-1 text-white font-medium">
                  Low Stock Alert Threshold
                  <HelpTooltip content="We'll notify you on the dashboard when inventory drops to or below this amount." />
                </Label>
                <StepperInput
                  id="reorder_level"
                  min={0}
                  step={5}
                  unit={commerceConfig?.sellingUnit || watch("unit_of_measure") || "units"}
                  value={watch("reorder_level")}
                  onChange={(val) => setValue("reorder_level", val, { shouldValidate: true })}
                  aria-label="Low stock alert threshold"
                />
                {errors.reorder_level && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.reorder_level.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border border-white/5 bg-black/40 p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="is_taxable" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tax Status
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Subject to sales tax
                  </p>
                </div>
                <Switch
                  id="is_taxable"
                  aria-label="Subject to sales tax"
                  checked={isTaxable ?? true}
                  onCheckedChange={(checked) =>
                    setValue("is_taxable", checked, { shouldDirty: true })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-1">
                Description / Strain Notes
                <HelpTooltip content="Detailed product specs, strain information, effects, or sourcing notes." />
              </Label>
              <Input
                id="description"
                placeholder="e.g. Sativa-dominant hybrid, citrus terpene profile"
                className="bg-black/50 border-white/10"
                {...register("description")}
              />
            </div>

            {!initialData?.id && commerceConfig && (
              <>
                <FractionalProductFields
                  value={commerceConfig}
                  basePrice={price}
                  onChange={(config) => {
                    setValue("commerce_config", config, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                    setValue(
                      "unit_of_measure",
                      config.sellingUnit as Inventory["unit_of_measure"],
                    );
                  }}
                />
                {(errors.commerce_config || invalidCommerce) && (
                  <p role="alert" className="text-sm text-destructive">
                    {commerceIssue(commerceConfig, price) || "Check the selling rules."}
                  </p>
                )}
                {invalidCommerce && <Button type="button" variant="outline" onClick={() => setValue("commerce_config", guidedCommerceProfile(commerceConfig.sellingUnit, commerceConfig.fractionalEnabled), { shouldDirty: true, shouldValidate: true })}>Use recommended selling rules</Button>}
              </>
            )}

            {/* Dynamic Margin Calculator Widget */}
            <div className="p-3 bg-black/60 rounded-lg border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground font-mono">
                <span>Profit Margin Calculator</span>
                <span className="text-[10px] text-accent/80 font-sans uppercase">
                  Live Feedback
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 rounded bg-white/5">
                  <p className="text-[10px] text-muted-foreground uppercase">
                    Net profit
                  </p>
                  <p
                    className={`text-sm font-semibold font-mono ${profit >= 0 ? "text-emerald-400" : "text-destructive"}`}
                  >
                    ${profit.toFixed(2)}
                  </p>
                </div>
                <div className="p-2 rounded bg-white/5">
                  <p className="text-[10px] text-muted-foreground uppercase">
                    Markup
                  </p>
                  <p
                    className={`text-sm font-semibold font-mono ${markupPercentage >= 0 ? "text-accent" : "text-destructive"}`}
                  >
                    {markupPercentage.toFixed(1)}%
                  </p>
                </div>
                <div className="p-2 rounded bg-white/5">
                  <p className="text-[10px] text-muted-foreground uppercase">
                    Gross Margin
                  </p>
                  <p
                    className={`text-sm font-semibold font-mono ${marginPercentage >= 0 ? "text-emerald-400" : "text-destructive"}`}
                  >
                    {marginPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </ProgressiveSection>
        </>
      )}

      {/* Conditionally Render Footer Buttons based on isGuided */}
      <div className="flex justify-end gap-2 pt-2">
        {isGuided ? (
          <>
            {wizardStep > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setWizardStep((prev) => prev - 1)}
                className="border-white/10 hover:bg-white/5"
              >
                Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="border-white/10 hover:bg-white/5"
              >
                Cancel
              </Button>
            )}

            {wizardStep < 2 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="bg-accent text-black hover:bg-accent/90 ml-auto"
              >
                Next Step
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-accent text-black hover:bg-accent/90 ml-auto"
              >
                {isSubmitting ? "Saving..." : "Create First Product"}
              </Button>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div>
              {initialData?.id && (
                initialData.is_active === false ? (
                  onReactivate && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onReactivate(initialData)}
                      className="border-accent/30 text-accent hover:bg-accent/10"
                    >
                      Reactivate Product
                    </Button>
                  )
                ) : (
                  onArchive && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onArchive(initialData)}
                      className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40"
                    >
                      Archive Product
                    </Button>
                  )
                )
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="border-white/10 hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-accent text-black hover:bg-accent/90"
              >
                {isSubmitting
                  ? "Saving..."
                  : initialData?.id
                    ? "Update Product"
                    : "Add Product"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
