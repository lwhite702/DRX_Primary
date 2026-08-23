"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type {
  MerchantCommerceSettings,
  ProductCommerceConfig,
} from "@/lib/commerce/config";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const convexEnabled = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

interface CommerceProduct {
  id: string;
  canonicalProductId?: Id<"products">;
  name: string;
  sku: string | null;
  baseUnitPrice: number;
  availableQuantity: number;
  config: ProductCommerceConfig;
}

interface CommerceCustomer {
  id: string;
  label: string;
}

interface CommerceResponse {
  businessId: string;
  merchant: MerchantCommerceSettings;
  products: CommerceProduct[];
  customers: CommerceCustomer[];
  error?: string;
}

function parsePositiveList(value: string) {
  return value
    .split(",")
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry) && entry > 0);
}

function listText(values: number[]) {
  return values.join(", ");
}

function CommerceSettingsPageInner() {
  const convexProducts = useQuery(api.products.listProducts, {});
  const convexCustomers = useQuery(api.customers.listCustomers, {});
  const memberDirectory = useQuery(api.members.listMembers, {});
  const canonicalSettings = useQuery(api.settings.getBusinessSettings, {});
  const updateCommerceConfig = useMutation(api.products.updateCommerceConfig);
  const updateCommerceSettings = useMutation(api.settings.updateCommerceSettings);
  const linkLegacyPrismaBusiness = useMutation(
    api.settings.linkLegacyPrismaBusiness,
  );
  const linkLegacyPrismaCustomer = useMutation(
    api.customers.linkLegacyPrismaCustomer,
  );
  const [products, setProducts] = useState<CommerceProduct[]>([]);
  const [customers, setCustomers] = useState<CommerceCustomer[]>([]);
  const [legacyBusinessId, setLegacyBusinessId] = useState("");
  const [merchant, setMerchant] = useState<MerchantCommerceSettings | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<CommerceProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingMerchant, setSavingMerchant] = useState(false);
  const [selectedLegacyCustomerId, setSelectedLegacyCustomerId] = useState("");
  const [selectedCanonicalCustomerId, setSelectedCanonicalCustomerId] =
    useState<Id<"customers"> | "">("");
  const [savingCustomerLink, setSavingCustomerLink] = useState(false);

  const load = useCallback(async () => {
    if (
      convexProducts === undefined ||
      convexCustomers === undefined ||
      canonicalSettings === undefined
    ) {
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/pos/commerce-settings");
      const data = (await response.json()) as CommerceResponse;
      if (!response.ok || data.error) throw new Error(data.error || "Unable to load settings");
      const canonicalByLegacyId = new Map(
        convexProducts
          .filter((product) => product.legacyPrismaId)
          .map((product) => [product.legacyPrismaId!, product]),
      );
      const reconciledProducts = data.products.map((product) => {
        const canonical = canonicalByLegacyId.get(product.id);
        if (!canonical) return product;
        return {
          ...product,
          canonicalProductId: canonical._id,
          baseUnitPrice: canonical.sellingPriceCents / 100,
          config: {
            ...product.config,
            fractionalEnabled: canonical.allowFractionalWeight,
            sellingUnit: canonical.sellingUnit ?? product.config.sellingUnit,
            decimalPrecision:
              canonical.quantityPrecision ?? product.config.decimalPrecision,
            minimumSaleQuantity:
              canonical.minimumSaleQuantity ??
              product.config.minimumSaleQuantity,
            quantityIncrement:
              canonical.quantityIncrement ?? product.config.quantityIncrement,
            suggestedQuantities:
              canonical.suggestedQuantityPresets ??
              product.config.suggestedQuantities,
            suggestedDollarAmounts:
              canonical.suggestedDollarPresetsCents?.map(
                (amount) => amount / 100,
              ) ?? product.config.suggestedDollarAmounts,
            bulkPriceTiers:
              canonical.bulkPriceTiers?.map((tier, index) => ({
                id: `canonical-${index}-${tier.minimumQuantity}`,
                label: `${tier.minimumQuantity}+ ${canonical.sellingUnit ?? "units"}`,
                minimumQuantity: tier.minimumQuantity,
                unitPrice: tier.unitPriceCents / 100,
              })) ?? product.config.bulkPriceTiers,
          },
        };
      });
      const canonicalMerchant = canonicalSettings.settings;
      const reconciledMerchant: MerchantCommerceSettings = canonicalMerchant
        ? {
            ...data.merchant,
            loyaltyCombinationPolicy:
              canonicalMerchant.loyaltyCombinationPolicy ??
              data.merchant.loyaltyCombinationPolicy,
            loyaltyTiers:
              canonicalMerchant.loyaltyTiers?.map((tier, index) => ({
                id: `canonical-${index}-${tier.minimumSpendCents}`,
                label: tier.name,
                minimumSpendCents: tier.minimumSpendCents,
                discountRate: tier.discountRateBps / 10_000,
              })) ?? data.merchant.loyaltyTiers,
            deliveryFeeTaxable:
              canonicalMerchant.deliveryFeeTaxable ??
              data.merchant.deliveryFeeTaxable,
            dispatchSlaMinutes:
              canonicalMerchant.deliveryDispatchSlaMinutes ??
              data.merchant.dispatchSlaMinutes,
            escalationDelayMinutes:
              canonicalMerchant.deliveryManagerEscalationMinutes ??
              data.merchant.escalationDelayMinutes,
            managerNotificationTargets:
              canonicalMerchant.deliveryManagerNotificationUserIds ??
              data.merchant.managerNotificationTargets,
          }
        : data.merchant;
      setProducts(reconciledProducts);
      setCustomers(data.customers);
      setLegacyBusinessId(data.businessId);
      setMerchant(reconciledMerchant);
      const nextId = selectedId || reconciledProducts[0]?.id || "";
      setSelectedId(nextId);
      const product = reconciledProducts.find((item) => item.id === nextId) ?? null;
      setDraft(product ? structuredClone(product) : null);
      const nextLegacyCustomerId =
        selectedLegacyCustomerId || data.customers[0]?.id || "";
      setSelectedLegacyCustomerId(nextLegacyCustomerId);
      setSelectedCanonicalCustomerId(
        convexCustomers.find(
          (customer) => customer.legacyPrismaId === nextLegacyCustomerId,
        )?._id ?? "",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load settings");
    } finally {
      setLoading(false);
    }
  }, [
    canonicalSettings,
    convexCustomers,
    convexProducts,
    selectedId,
    selectedLegacyCustomerId,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === selectedId) ?? null,
    [products, selectedId],
  );

  const selectProduct = (id: string) => {
    setSelectedId(id);
    const product = products.find((item) => item.id === id) ?? null;
    setDraft(product ? structuredClone(product) : null);
  };

  const saveProduct = async () => {
    if (!draft) return;
    setSavingProduct(true);
    try {
      const canonicalProduct = convexProducts?.find(
        (product) => product._id === draft.canonicalProductId,
      );
      if (!canonicalProduct) {
        throw new Error(
          "Select the matching canonical mobile product before saving selling rules.",
        );
      }
      if (!legacyBusinessId) {
        throw new Error("The legacy web business identity is unavailable");
      }
      await updateCommerceConfig({
        productId: canonicalProduct._id,
        legacyPrismaBusinessId: legacyBusinessId,
        legacyPrismaId: draft.id,
        allowFractionalQuantity: draft.config.fractionalEnabled,
        baseUnitPriceCents: Math.round(draft.baseUnitPrice * 100),
        sellingUnit: draft.config.sellingUnit,
        quantityPrecision: draft.config.decimalPrecision,
        minimumSaleQuantity: draft.config.minimumSaleQuantity,
        quantityIncrement: draft.config.quantityIncrement,
        suggestedQuantityPresets: draft.config.suggestedQuantities,
        suggestedDollarPresetsCents: draft.config.suggestedDollarAmounts.map(
          (amount) => Math.round(amount * 100),
        ),
        bulkPriceTiers: [...draft.config.bulkPriceTiers]
          .sort((left, right) => left.minimumQuantity - right.minimumQuantity)
          .map((tier) => ({
            minimumQuantity: tier.minimumQuantity,
            unitPriceCents: Math.round(tier.unitPrice * 100),
          })),
      });
      const response = await fetch("/api/pos/commerce-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: {
            inventoryId: draft.id,
            baseUnitPrice: draft.baseUnitPrice,
            config: draft.config,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error ||
            "Canonical rules were saved, but the transitional web catalog did not synchronize. Retry before checkout.",
        );
      }
      setProducts((current) =>
        current.map((item) => (item.id === draft.id ? structuredClone(draft) : item)),
      );
      toast.success("Product selling rules saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save product settings");
    } finally {
      setSavingProduct(false);
    }
  };

  const saveCustomerLink = async () => {
    if (
      !legacyBusinessId ||
      !selectedLegacyCustomerId ||
      !selectedCanonicalCustomerId
    ) {
      return;
    }
    setSavingCustomerLink(true);
    try {
      await linkLegacyPrismaBusiness({
        legacyPrismaBusinessId: legacyBusinessId,
      });
      await linkLegacyPrismaCustomer({
        customerId: selectedCanonicalCustomerId,
        legacyPrismaId: selectedLegacyCustomerId,
      });
      toast.success("Customer records linked for cross-platform checkout");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to link customer records",
      );
    } finally {
      setSavingCustomerLink(false);
    }
  };

  const saveMerchant = async () => {
    if (!merchant) return;
    setSavingMerchant(true);
    try {
      await updateCommerceSettings({
        loyaltyCombinationPolicy: merchant.loyaltyCombinationPolicy,
        loyaltyTiers: [...merchant.loyaltyTiers]
          .sort((left, right) => left.minimumSpendCents - right.minimumSpendCents)
          .map((tier) => ({
            name: tier.label,
            minimumSpendCents: tier.minimumSpendCents,
            discountRateBps: Math.round(tier.discountRate * 10_000),
          })),
        deliveryFeeTaxable: merchant.deliveryFeeTaxable,
        deliveryDispatchSlaMinutes: merchant.dispatchSlaMinutes,
        deliveryManagerEscalationMinutes: merchant.escalationDelayMinutes,
        deliveryManagerNotificationUserIds:
          merchant.managerNotificationTargets,
      });
      const response = await fetch("/api/pos/commerce-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error ||
            "Canonical policy was saved, but the transitional web settings did not synchronize. Retry before checkout.",
        );
      }
      toast.success("Loyalty and delivery rules saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save merchant settings");
    } finally {
      setSavingMerchant(false);
    }
  };

  if (loading || !merchant) {
    return <div className="p-8 text-sm text-muted-foreground" role="status">Loading commerce settings…</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold">Commerce & Delivery</h1>
        <p className="mt-2 text-muted-foreground">
          Configure fractional selling, suggested amounts, bulk tiers, loyalty, and delivery accountability.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Product selling rules</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add inventory before configuring product selling rules.</p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="commerce-product">Product</Label>
                <select
                  id="commerce-product"
                  value={selectedId}
                  onChange={(event) => selectProduct(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}{product.sku ? ` — ${product.sku}` : ""}
                    </option>
                  ))}
                </select>
                {selectedProduct ? (
                  <p className="text-xs text-muted-foreground">
                    Available: {selectedProduct.availableQuantity} {selectedProduct.config.sellingUnit}
                  </p>
                ) : null}
              </div>

              {draft ? (
                <>
                  <div className="space-y-2 rounded-lg border p-4">
                    <Label htmlFor="canonical-product">Canonical mobile product</Label>
                    <select
                      id="canonical-product"
                      value={draft.canonicalProductId ?? ""}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          canonicalProductId: event.target.value
                            ? (event.target.value as Id<"products">)
                            : undefined,
                        })
                      }
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Select the matching product</option>
                      {convexProducts
                        ?.filter(
                          (product) =>
                            !product.legacyPrismaId ||
                            product.legacyPrismaId === draft.id,
                        )
                        .map((product) => (
                          <option key={product._id} value={product._id}>
                            {product.productName} — {product.sku}
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      This explicit link is permanent and prevents SKU collisions from routing a sale to the wrong inventory record.
                    </p>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <Label htmlFor="fractional-enabled">Allow fractional sales</Label>
                      <p className="text-sm text-muted-foreground">Operators can enter a dollar value or a measured quantity.</p>
                    </div>
                    <Switch
                      id="fractional-enabled"
                      checked={draft.config.fractionalEnabled}
                      onCheckedChange={(fractionalEnabled) =>
                        setDraft({ ...draft, config: { ...draft.config, fractionalEnabled } })
                      }
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-5">
                    <div className="space-y-2">
                      <Label htmlFor="selling-unit">Selling unit</Label>
                      <Input id="selling-unit" value={draft.config.sellingUnit} onChange={(event) => setDraft({ ...draft, config: { ...draft.config, sellingUnit: event.target.value } })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit-price">Price per unit</Label>
                      <Input id="unit-price" type="number" min="0.0001" step="0.0001" value={draft.baseUnitPrice} onChange={(event) => setDraft({ ...draft, baseUnitPrice: Number(event.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minimum-sale-quantity">Minimum sale quantity</Label>
                      <Input id="minimum-sale-quantity" type="number" min="0.000001" step="0.000001" value={draft.config.minimumSaleQuantity} onChange={(event) => setDraft({ ...draft, config: { ...draft.config, minimumSaleQuantity: Number(event.target.value) } })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity-increment">Quantity increment</Label>
                      <Input id="quantity-increment" type="number" min="0.000001" step="0.000001" value={draft.config.quantityIncrement} onChange={(event) => setDraft({ ...draft, config: { ...draft.config, quantityIncrement: Number(event.target.value) } })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="decimal-precision">Decimal places</Label>
                      <Input id="decimal-precision" type="number" min="0" max="6" value={draft.config.decimalPrecision} onChange={(event) => setDraft({ ...draft, config: { ...draft.config, decimalPrecision: Number(event.target.value) } })} />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dollar-presets">Suggested dollar amounts</Label>
                      <Input id="dollar-presets" value={listText(draft.config.suggestedDollarAmounts)} onChange={(event) => setDraft({ ...draft, config: { ...draft.config, suggestedDollarAmounts: parsePositiveList(event.target.value) } })} placeholder="10, 20, 50" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity-presets">Suggested quantities</Label>
                      <Input id="quantity-presets" value={listText(draft.config.suggestedQuantities)} onChange={(event) => setDraft({ ...draft, config: { ...draft.config, suggestedQuantities: parsePositiveList(event.target.value) } })} placeholder="3.5, 7, 14" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Bulk price tiers</Label>
                        <p className="text-xs text-muted-foreground">The highest qualifying threshold is applied automatically.</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => setDraft({ ...draft, config: { ...draft.config, bulkPriceTiers: [...draft.config.bulkPriceTiers, { id: crypto.randomUUID(), label: "New tier", minimumQuantity: 1, unitPrice: draft.baseUnitPrice }] } })}>
                        <Plus className="mr-1 h-4 w-4" /> Add tier
                      </Button>
                    </div>
                    {draft.config.bulkPriceTiers.map((tier, index) => (
                      <div key={tier.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                        <Input aria-label={`Tier ${index + 1} label`} value={tier.label} onChange={(event) => setDraft({ ...draft, config: { ...draft.config, bulkPriceTiers: draft.config.bulkPriceTiers.map((item) => item.id === tier.id ? { ...item, label: event.target.value } : item) } })} />
                        <Input aria-label={`Tier ${index + 1} minimum quantity`} type="number" min="0.0001" step="0.0001" value={tier.minimumQuantity} onChange={(event) => setDraft({ ...draft, config: { ...draft.config, bulkPriceTiers: draft.config.bulkPriceTiers.map((item) => item.id === tier.id ? { ...item, minimumQuantity: Number(event.target.value) } : item) } })} />
                        <Input aria-label={`Tier ${index + 1} unit price`} type="number" min="0.0001" step="0.0001" value={tier.unitPrice} onChange={(event) => setDraft({ ...draft, config: { ...draft.config, bulkPriceTiers: draft.config.bulkPriceTiers.map((item) => item.id === tier.id ? { ...item, unitPrice: Number(event.target.value) } : item) } })} />
                        <Button type="button" variant="ghost" size="icon" aria-label={`Remove tier ${index + 1}`} onClick={() => setDraft({ ...draft, config: { ...draft.config, bulkPriceTiers: draft.config.bulkPriceTiers.filter((item) => item.id !== tier.id) } })}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>

                  <Button type="button" onClick={saveProduct} disabled={savingProduct}>{savingProduct ? "Saving…" : "Save product rules"}</Button>
                </>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Cross-platform customer links</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Link an existing web customer to the same canonical customer used by iOS and Android. Links are permanent, tenant-scoped, and never inferred from a phone number.
          </p>
          {customers.length === 0 || !convexCustomers?.length ? (
            <p className="text-sm text-muted-foreground">
              Add customers in both catalogs before creating a cross-platform link.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="legacy-customer">Web customer</Label>
                <select
                  id="legacy-customer"
                  value={selectedLegacyCustomerId}
                  onChange={(event) => {
                    const legacyId = event.target.value;
                    setSelectedLegacyCustomerId(legacyId);
                    setSelectedCanonicalCustomerId(
                      convexCustomers.find(
                        (customer) => customer.legacyPrismaId === legacyId,
                      )?._id ?? "",
                    );
                  }}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="canonical-customer">Canonical mobile customer</Label>
                <select
                  id="canonical-customer"
                  value={selectedCanonicalCustomerId}
                  onChange={(event) =>
                    setSelectedCanonicalCustomerId(
                      event.target.value as Id<"customers"> | "",
                    )
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select the matching customer</option>
                  {convexCustomers
                    .filter(
                      (customer) =>
                        !customer.legacyPrismaId ||
                        customer.legacyPrismaId === selectedLegacyCustomerId,
                    )
                    .map((customer) => (
                      <option key={customer._id} value={customer._id}>
                        {[customer.firstName, customer.lastName]
                          .filter(Boolean)
                          .join(" ") || `Customer ${String(customer._id).slice(-8)}`}
                      </option>
                    ))}
                </select>
              </div>
              <Button
                type="button"
                disabled={
                  savingCustomerLink ||
                  !selectedLegacyCustomerId ||
                  !selectedCanonicalCustomerId
                }
                onClick={() => void saveCustomerLink()}
              >
                {savingCustomerLink ? "Linking…" : "Link records"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Loyalty & delivery policy</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="loyalty-policy">Bulk and loyalty combination</Label>
            <select id="loyalty-policy" value={merchant.loyaltyCombinationPolicy} onChange={(event) => setMerchant({ ...merchant, loyaltyCombinationPolicy: event.target.value as "stack" | "best_only" })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="best_only">Apply the best benefit only</option>
              <option value="stack">Stack loyalty after bulk pricing</option>
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div><Label>Spend-based loyalty tiers</Label><p className="text-xs text-muted-foreground">Delivery fees and tax are excluded from qualifying spend.</p></div>
              <Button type="button" variant="outline" size="sm" onClick={() => setMerchant({ ...merchant, loyaltyTiers: [...merchant.loyaltyTiers, { id: crypto.randomUUID(), label: "New tier", minimumSpendCents: 0, discountRate: 0 }] })}><Plus className="mr-1 h-4 w-4" /> Add tier</Button>
            </div>
            {merchant.loyaltyTiers.map((tier, index) => (
              <div key={tier.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                <Input aria-label={`Loyalty tier ${index + 1} label`} value={tier.label} onChange={(event) => setMerchant({ ...merchant, loyaltyTiers: merchant.loyaltyTiers.map((item) => item.id === tier.id ? { ...item, label: event.target.value } : item) })} />
                <Input aria-label={`Loyalty tier ${index + 1} spend`} type="number" min="0" step="1" value={tier.minimumSpendCents / 100} onChange={(event) => setMerchant({ ...merchant, loyaltyTiers: merchant.loyaltyTiers.map((item) => item.id === tier.id ? { ...item, minimumSpendCents: Math.round(Number(event.target.value) * 100) } : item) })} />
                <Input aria-label={`Loyalty tier ${index + 1} discount`} type="number" min="0" max="100" step="0.1" value={tier.discountRate * 100} onChange={(event) => setMerchant({ ...merchant, loyaltyTiers: merchant.loyaltyTiers.map((item) => item.id === tier.id ? { ...item, discountRate: Number(event.target.value) / 100 } : item) })} />
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove loyalty tier ${index + 1}`} onClick={() => setMerchant({ ...merchant, loyaltyTiers: merchant.loyaltyTiers.filter((item) => item.id !== tier.id) })}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div><Label htmlFor="delivery-taxable">Tax customer-paid delivery fee</Label><p className="text-sm text-muted-foreground">Applied only when the customer is charged the vendor fee.</p></div>
            <Switch id="delivery-taxable" checked={merchant.deliveryFeeTaxable} onCheckedChange={(deliveryFeeTaxable) => setMerchant({ ...merchant, deliveryFeeTaxable })} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="dispatch-sla">Minutes to order Uber</Label><Input id="dispatch-sla" type="number" min="1" max="120" value={merchant.dispatchSlaMinutes} onChange={(event) => setMerchant({ ...merchant, dispatchSlaMinutes: Number(event.target.value) })} /></div>
            <div className="space-y-2"><Label htmlFor="escalation-delay">Manager escalation delay</Label><Input id="escalation-delay" type="number" min="1" max="240" value={merchant.escalationDelayMinutes} onChange={(event) => setMerchant({ ...merchant, escalationDelayMinutes: Number(event.target.value) })} /></div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Manager escalation recipients</Label>
              <p className="text-xs text-muted-foreground">
                Select active owners or admins who should receive overdue escalations.
              </p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {memberDirectory?.members
                .filter(
                  (member) =>
                    member.status === "ACTIVE" &&
                    (member.role === "OWNER" || member.role === "ADMIN"),
                )
                .map((member) => {
                  const selected = merchant.managerNotificationTargets.includes(
                    member.clerkUserId,
                  );
                  return (
                    <label
                      key={member._id}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3 text-sm"
                    >
                      <span>
                        <span className="block font-medium">
                          {member.name || member.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {member.role.toLowerCase()}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) =>
                          setMerchant({
                            ...merchant,
                            managerNotificationTargets: event.target.checked
                              ? [
                                  ...new Set([
                                    ...merchant.managerNotificationTargets,
                                    member.clerkUserId,
                                  ]),
                                ]
                              : merchant.managerNotificationTargets.filter(
                                  (userId) => userId !== member.clerkUserId,
                                ),
                          })
                        }
                        className="h-4 w-4 rounded border-input accent-primary"
                      />
                    </label>
                  );
                })}
              {memberDirectory &&
              memberDirectory.members.every(
                (member) =>
                  member.status !== "ACTIVE" ||
                  (member.role !== "OWNER" && member.role !== "ADMIN"),
              ) ? (
                <p className="text-sm text-muted-foreground">
                  No active manager recipients are available.
                </p>
              ) : null}
            </div>
          </div>

          <Button type="button" onClick={saveMerchant} disabled={savingMerchant}>{savingMerchant ? "Saving…" : "Save loyalty & delivery policy"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CommerceSettingsPage() {
  if (!convexEnabled) {
    return (
      <div className="p-4 md:p-8">
        <Card>
          <CardHeader><CardTitle>Commerce & Delivery</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Canonical product and delivery configuration is unavailable in this environment. Configure a valid Convex deployment before editing mobile selling rules.
          </CardContent>
        </Card>
      </div>
    );
  }
  return <CommerceSettingsPageInner />;
}
