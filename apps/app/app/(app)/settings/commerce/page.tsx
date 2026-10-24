"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
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

const convexEnabled = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

interface CommerceProduct {
  id: string;
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
  const session = useQuery(api.session.currentBusiness, {});
  const memberDirectory = useQuery(api.members.listMembers, {});
  const [products, setProducts] = useState<CommerceProduct[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [merchant, setMerchant] = useState<MerchantCommerceSettings | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<CommerceProduct | null>(null);
  const [dollarPresetsInput, setDollarPresetsInput] = useState("");
  const [quantityPresetsInput, setQuantityPresetsInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadController = useRef<AbortController | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingMerchant, setSavingMerchant] = useState(false);

  const load = useCallback(async () => {
    loadController.current?.abort();
    setLoading(true);
    setLoadError(null);
    if (session === undefined) return;
    const controller = new AbortController();
    loadController.current = controller;
    try {
      const response = await fetch("/api/pos/commerce-settings", {
        signal: controller.signal,
        headers: { "x-business-id": session.businessId },
      });
      const data = (await response.json()) as CommerceResponse;
      if (controller.signal.aborted) return;
      if (response.status === 401) {
        throw new Error("Sign in and select your business, then try again.");
      }
      if (response.status === 403) {
        throw new Error(
          data.error && data.error !== "Forbidden"
            ? data.error
            : "You don’t have permission to configure commerce for this business. Ask an owner or administrator for access.",
        );
      }
      if (!response.ok || data.error) throw new Error(data.error || "Unable to load settings");
      if (data.businessId !== session.businessId) throw new Error("The returned settings do not match the selected business. Reload before continuing.");
      setProducts(data.products);
      setBusinessId(data.businessId);
      setMerchant(data.merchant);
      const next = data.products[0] ?? null;
      setSelectedId(next?.id ?? "");
      setDraft(next ? structuredClone(next) : null);
      setDollarPresetsInput(next ? listText(next.config.suggestedDollarAmounts) : "");
      setQuantityPresetsInput(next ? listText(next.config.suggestedQuantities) : "");
    } catch (error) {
      if (controller.signal.aborted) return;
      const message =
        error instanceof Error ? error.message : "Unable to load settings";
      setLoadError(message);
      toast.error(message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
    return () => loadController.current?.abort();
  }, [load]);

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === selectedId) ?? null,
    [products, selectedId],
  );

  const selectProduct = (id: string) => {
    setSelectedId(id);
    const product = products.find((item) => item.id === id) ?? null;
    setDraft(product ? structuredClone(product) : null);
    setDollarPresetsInput(product ? listText(product.config.suggestedDollarAmounts) : "");
    setQuantityPresetsInput(product ? listText(product.config.suggestedQuantities) : "");
  };

  const saveProduct = async () => {
    if (!draft) return;
    setSavingProduct(true);
    try {
      if (businessId !== session?.businessId) throw new Error("Business selection changed. Reload before saving.");
      const response = await fetch("/api/pos/commerce-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-business-id": businessId },
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
            "Product rules could not be saved. Please retry.",
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

  const saveMerchant = async () => {
    if (!merchant) return;
    setSavingMerchant(true);
    try {
      if (businessId !== session?.businessId) throw new Error("Business selection changed. Reload before saving.");
      const response = await fetch("/api/pos/commerce-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-business-id": businessId },
        body: JSON.stringify({ merchant }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error ||
            "Commerce policy could not be saved. Please retry.",
        );
      }
      toast.success("Loyalty and delivery rules saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save merchant settings");
    } finally {
      setSavingMerchant(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground" role="status">Loading commerce settings…</div>;
  }

  if (loadError || !merchant) {
    return (
      <div className="p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Commerce settings could not be loaded</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p role="alert" className="text-sm text-muted-foreground">
              {loadError || "Commerce settings are unavailable. Please try again."}
            </p>
            <Button onClick={() => void load()}>Try again</Button>
          </CardContent>
        </Card>
      </div>
    );
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
                      <Input
                        id="selling-unit"
                        value={draft.config.sellingUnit}
                        disabled={Boolean(selectedProduct && selectedProduct.availableQuantity > 0)}
                        onChange={(event) => setDraft({ ...draft, config: { ...draft.config, sellingUnit: event.target.value } })}
                      />
                      {selectedProduct && selectedProduct.availableQuantity > 0 && (
                        <p className="text-xs text-muted-foreground">Unit is locked while stock exists. Reconcile stock to change.</p>
                      )}
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
                      <Input
                        id="dollar-presets"
                        value={dollarPresetsInput}
                        onChange={(event) => {
                          setDollarPresetsInput(event.target.value);
                          setDraft({
                            ...draft,
                            config: {
                              ...draft.config,
                              suggestedDollarAmounts: parsePositiveList(event.target.value),
                            },
                          });
                        }}
                        placeholder="10, 20, 50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity-presets">Suggested quantities</Label>
                      <Input
                        id="quantity-presets"
                        value={quantityPresetsInput}
                        onChange={(event) => {
                          setQuantityPresetsInput(event.target.value);
                          setDraft({
                            ...draft,
                            config: {
                              ...draft.config,
                              suggestedQuantities: parsePositiveList(event.target.value),
                            },
                          });
                        }}
                        placeholder="3.5, 7, 14"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Bulk price tiers</Label>
                        <p className="text-xs text-muted-foreground">The highest qualifying threshold applies to the full quantity. Enter either a price per unit or an exact total at that quantity.</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => { const minimumQuantity = (draft.config.bulkPriceTiers.at(-1)?.minimumQuantity ?? draft.config.minimumSaleQuantity) + draft.config.quantityIncrement; setDraft({ ...draft, config: { ...draft.config, bulkPriceTiers: [...draft.config.bulkPriceTiers, { id: crypto.randomUUID(), label: `${minimumQuantity}+`, minimumQuantity, unitPrice: draft.baseUnitPrice }] } }); }}>
                        <Plus className="mr-1 h-4 w-4" /> Add tier
                      </Button>
                    </div>
                    {draft.config.bulkPriceTiers.map((tier, index) => (
                      <div key={tier.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                        <Input aria-label={`Tier ${index + 1} label`} value={tier.label} onChange={(event) => setDraft({ ...draft, config: { ...draft.config, bulkPriceTiers: draft.config.bulkPriceTiers.map((item) => item.id === tier.id ? { ...item, label: event.target.value } : item) } })} />
                        <Input aria-label={`Tier ${index + 1} minimum quantity`} type="number" min="0.0001" step="0.0001" value={tier.minimumQuantity} onChange={(event) => { const minimumQuantity = Number(event.target.value); setDraft({ ...draft, config: { ...draft.config, bulkPriceTiers: draft.config.bulkPriceTiers.map((item) => item.id === tier.id ? { ...item, minimumQuantity, unitPrice: item.totalPrice !== undefined && minimumQuantity > 0 ? item.totalPrice / minimumQuantity : item.unitPrice } : item) } }); }} />
                        <Input aria-label={`Tier ${index + 1} unit price`} type="number" min="0.0001" step="0.0001" value={tier.totalPrice === undefined ? tier.unitPrice : Number((tier.totalPrice / tier.minimumQuantity).toFixed(4))} onChange={(event) => setDraft({ ...draft, config: { ...draft.config, bulkPriceTiers: draft.config.bulkPriceTiers.map((item) => item.id === tier.id ? { ...item, unitPrice: Number(event.target.value), totalPrice: undefined } : item) } })} />
                        <Input aria-label={`Tier ${index + 1} exact total price`} type="number" min="0.01" step="0.01" placeholder="Exact total ($)" value={tier.totalPrice ?? ""} onChange={(event) => setDraft({ ...draft, config: { ...draft.config, bulkPriceTiers: draft.config.bulkPriceTiers.map((item) => item.id === tier.id ? { ...item, totalPrice: event.target.value ? Number(event.target.value) : undefined, unitPrice: event.target.value ? Number(event.target.value) / item.minimumQuantity : item.unitPrice } : item) } })} />
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

          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="card-fee-enabled">Card processor fee</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically apply a processor surcharge when Card is selected at checkout.
                </p>
              </div>
              <Switch
                id="card-fee-enabled"
                checked={Boolean(merchant.cardProcessorFeeEnabled)}
                onCheckedChange={(cardProcessorFeeEnabled) =>
                  setMerchant({
                    ...merchant,
                    cardProcessorFeeEnabled,
                    cardProcessorFeeType:
                      merchant.cardProcessorFeeType ?? "percentage",
                    cardProcessorFeeBps: merchant.cardProcessorFeeBps ?? 300,
                    cardProcessorFeeFlatCents:
                      merchant.cardProcessorFeeFlatCents ?? 0,
                  })
                }
              />
            </div>

            {merchant.cardProcessorFeeEnabled && (
              <div className="grid gap-4 md:grid-cols-3 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="card-fee-type">Fee calculation mode</Label>
                  <select
                    id="card-fee-type"
                    value={merchant.cardProcessorFeeType ?? "percentage"}
                    onChange={(event) =>
                      setMerchant({
                        ...merchant,
                        cardProcessorFeeType: event.target.value as
                          | "percentage"
                          | "flat"
                          | "both",
                      })
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="percentage">Percentage only (%)</option>
                    <option value="flat">Flat amount only ($)</option>
                    <option value="both">Percentage + Flat ($ + %)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-fee-percent">Processor percentage (%)</Label>
                  <Input
                    id="card-fee-percent"
                    type="number"
                    min="0"
                    max="50"
                    step="0.05"
                    value={((merchant.cardProcessorFeeBps ?? 300) / 100).toFixed(2)}
                    onChange={(event) =>
                      setMerchant({
                        ...merchant,
                        cardProcessorFeeBps: Math.max(
                          0,
                          Math.min(5000, Math.round(Number(event.target.value) * 100)),
                        ),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-fee-flat">Flat processor fee ($)</Label>
                  <Input
                    id="card-fee-flat"
                    type="number"
                    min="0"
                    max="500"
                    step="0.01"
                    value={((merchant.cardProcessorFeeFlatCents ?? 0) / 100).toFixed(2)}
                    onChange={(event) =>
                      setMerchant({
                        ...merchant,
                        cardProcessorFeeFlatCents: Math.max(
                          0,
                          Math.min(50000, Math.round(Number(event.target.value) * 100)),
                        ),
                      })
                    }
                  />
                </div>
              </div>
            )}
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
                    ["OWNER", "ADMIN", "owner", "admin", "manager"].includes(member.role),
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
                  (!["OWNER", "ADMIN", "owner", "admin", "manager"].includes(member.role)),
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
            Commerce settings are temporarily unavailable. Please try again later.
          </CardContent>
        </Card>
      </div>
    );
  }
  return <CommerceSettingsPageInner />;
}
