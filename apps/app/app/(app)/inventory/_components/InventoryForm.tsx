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
  creationCommerceDefaults,
  newProductCommerceSchema,
} from "@/lib/commerce/product-creation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InventoryFormProps {
  initialData?: Inventory | null;
  businessId: string;
  onSuccess: (data: Inventory) => Promise<string | void>;
  onCancel: () => void;
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
  isFirstProduct = false,
}: InventoryFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<Inventory>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      business_id: businessId,
      quantity_on_hand: 0,
      reorder_level: 10,
      unit_of_measure: "g", // Default
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

  const handleNext = async () => {
    let fieldsToValidate: (keyof Inventory)[] = [];
    if (wizardStep === 0) {
      fieldsToValidate = ["sku", "product_name"];
    } else if (wizardStep === 1) {
      fieldsToValidate = ["quantity_on_hand", "reorder_level"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setWizardStep((prev) => prev + 1);
    }
  };

  const [selectedCategoryType, setSelectedCategoryType] =
    React.useState<string>(() => {
      if (!initialData?.category) return "";
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
  const invalidCommerce =
    commerceConfig &&
    !newProductCommerceSchema.safeParse(commerceConfig).success;

  // Calculate margins in real time
  const cost = typeof unitCost === "number" && !isNaN(unitCost) ? unitCost : 0;
  const price =
    typeof sellingPrice === "number" && !isNaN(sellingPrice) ? sellingPrice : 0;
  const profit = price - cost;
  const marginPercentage = price > 0 ? (profit / price) * 100 : 0;
  const markupPercentage = cost > 0 ? (profit / cost) * 100 : 0;

  // Auto-set unit based on category
  React.useEffect(() => {
    const isExistingItem =
      initialData &&
      "id" in initialData &&
      !!(initialData as { id?: string }).id;

    if (category && !isExistingItem) {
      const unit = getUnitForCategory(category);
      setValue("unit_of_measure", unit);
      if (commerceConfig) setValue("commerce_config.sellingUnit", unit);
    }
  }, [category, initialData, setValue, commerceConfig]);

  return (
    <form onSubmit={handleSubmit(onSuccess)} className="space-y-6 text-left">
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
            <div className="space-y-2">
              <Label htmlFor="sku" className="flex items-center gap-1">
                SKU *
                <HelpTooltip content="Stock Keeping Unit - a unique barcode or code identifier used to scan/track the product." />
              </Label>
              <Input
                id="sku"
                placeholder="e.g. FLWR-BD-01"
                className="bg-black/50 border-white/10"
                {...register("sku")}
              />
              {errors.sku && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.sku.message}
                </p>
              )}
            </div>
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
              <Select
                value={selectedCategoryType}
                onValueChange={(val) => {
                  setSelectedCategoryType(val);
                  if (val !== "Other") {
                    setValue("category", val);
                  } else {
                    setValue("category", "");
                  }
                }}
              >
                <SelectTrigger className="bg-black/50 border-white/10">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10 text-foreground">
                  {CATEGORIES_LIST.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other">Other (Custom)...</SelectItem>
                </SelectContent>
              </Select>

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
                className="flex items-center gap-1"
              >
                Initial Quantity On Hand ({commerceConfig?.sellingUnit || watch("unit_of_measure") || "units"}) *
                <HelpTooltip content="The current physical amount in stock. Measured in your chosen selling unit (e.g. grams or units)." />
              </Label>
              <Input
                id="quantity_on_hand"
                type="number"
                placeholder="0"
                className="bg-black/50 border-white/10"
                {...register("quantity_on_hand", { valueAsNumber: true })}
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
                className="flex items-center gap-1"
              >
                Reorder Alert Level *
                <HelpTooltip content="Shows a low-stock alert on Home when the count falls below this number." />
              </Label>
              <Input
                id="reorder_level"
                type="number"
                placeholder="10"
                className="bg-black/50 border-white/10"
                {...register("reorder_level", { valueAsNumber: true })}
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
              <Label htmlFor="unit_cost" className="flex items-center gap-1">
                Acquisition Unit Cost ($)
                <HelpTooltip content="What you paid per unit or gram. DRX uses it to work out profit." />
              </Label>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                placeholder="0.00"
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
                className="flex items-center gap-1"
              >
                Selling Retail Price ($)
                <HelpTooltip content="The base retail price customers pay per unit or per gram at checkout." />
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

          {!initialData?.id && commerceConfig && (
            <>
              <FractionalProductFields
                value={commerceConfig}
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
                  Check your selling rules: use positive quantities that fit the
                  decimal places, and presets aligned to the minimum plus
                  increments.
                </p>
              )}
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
                <Label htmlFor="category" className="flex items-center gap-1">
                  Category
                  <HelpTooltip content="Categories map products to correct tax rates and measuring units." />
                </Label>
                <Select
                  value={selectedCategoryType}
                  onValueChange={(val) => {
                    setSelectedCategoryType(val);
                    if (val !== "Other") {
                      setValue("category", val);
                    } else {
                      setValue("category", "");
                    }
                  }}
                >
                  <SelectTrigger className="bg-black/50 border-white/10">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10 text-foreground">
                    {CATEGORIES_LIST.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                    <SelectItem value="Other">Other (Custom)...</SelectItem>
                  </SelectContent>
                </Select>

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="selling_price" className="flex items-center gap-1">
                  Selling Retail Price ($) *
                  <HelpTooltip content="The base retail price customers pay per unit or gram at checkout." />
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
                <Label htmlFor="unit_cost" className="flex items-center gap-1">
                  Acquisition Unit Cost ($)
                  <HelpTooltip content="What you paid per unit or gram. DRX uses it to work out profit." />
                </Label>
                <Input
                  id="unit_cost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
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

            <div className="space-y-2">
              <Label htmlFor="quantity_on_hand" className="flex items-center gap-1">
                Current Stock ({commerceConfig?.sellingUnit || watch("unit_of_measure") || "units"}) *
                <HelpTooltip content="The current physical amount on hand." />
              </Label>
              <Input
                id="quantity_on_hand"
                type="number"
                placeholder="0"
                className="bg-black/50 border-white/10"
                {...register("quantity_on_hand", { valueAsNumber: true })}
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
            description="SKU, location, tax, reorder alerts, strain notes, presets"
            defaultOpen={false}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku" className="flex items-center gap-1">
                  SKU *
                  <HelpTooltip content="Stock Keeping Unit - a unique identifier used to scan and track the item." />
                </Label>
                <Input
                  id="sku"
                  placeholder="e.g. FLWR-BD-01"
                  className="bg-black/50 border-white/10"
                  {...register("sku")}
                />
                {errors.sku && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.sku.message}
                  </p>
                )}
              </div>

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
                <Label htmlFor="reorder_level" className="flex items-center gap-1">
                  Reorder Alert Threshold
                  <HelpTooltip content="Shows a low-stock alert when the quantity falls below this level." />
                </Label>
                <Input
                  id="reorder_level"
                  type="number"
                  placeholder="10"
                  className="bg-black/50 border-white/10"
                  {...register("reorder_level", { valueAsNumber: true })}
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
                    Check your selling rules: use positive quantities that fit the
                    decimal places, and presets aligned to the minimum plus
                    increments.
                  </p>
                )}
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
          <>
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
          </>
        )}
      </div>
    </form>
  );
}
