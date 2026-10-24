"use client";

import { useEffect, useRef, useState } from "react";
import { usePrivacyContext } from "@/lib/privacy/use-privacy-context";
import {
  maskAlias,
  shouldMaskFromProtocol,
} from "@/lib/privacy/masking";
import type { QuickPosCustomer, QuickPosCustomerFavoriteItem } from "@/lib/quick-pos/types";
import { toTitleCase } from "@/lib/utils/format-text";

interface CustomerItem {
  id: string;
  phone: string;
  alias: string;
  remainingCredit: number;
  totalCreditUsed?: number;
  creditLimit?: number;
  firstName?: string;
  lastName?: string;
  loyaltyTier?: string;
  discountRateBps?: number | null;
  fixedPricePerGram?: number | null;
  customProductPrices?: Array<{
    productId: string;
    productName: string;
    pricePerUnit: number;
  }>;
  purchaseCount?: number;
  totalPurchases?: number;
  recentFavorites?: QuickPosCustomerFavoriteItem[];
}

function looksLikePhoneInput(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const digits = trimmed.replace(/[^0-9]/g, "");
  const letters = trimmed.replace(/[^a-zA-Z]/g, "");
  return digits.length >= 3 && letters.length === 0;
}

export function CustomerInline({
  attached,
  onAttach,
  onDetach,
}: {
  attached: { id: string | null; phone: string; alias: string | null; remainingCredit?: number };
  onAttach: (value: { id: string; phone: string; alias: string; remainingCredit: number }) => void;
  onDetach?: () => void;
}) {
  const richAttached = attached as QuickPosCustomer;
  const [queryInput, setQueryInput] = useState("");
  const [secondaryInput, setSecondaryInput] = useState("");
  const [results, setResults] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [switchingCustomer, setSwitchingCustomer] = useState(false);
  const [previousCustomer, setPreviousCustomer] = useState<CustomerItem | null>(null);
  const [favorites, setFavorites] = useState<QuickPosCustomerFavoriteItem[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const privacy = usePrivacyContext();
  const requestGeneration = useRef(0);

  useEffect(() => {
    requestGeneration.current += 1;
    setResults([]);
    setQueryInput("");
    setSecondaryInput("");
    setLoading(false);
    setHasSearched(false);
    setSwitchingCustomer(false);
    setCreateError(null);
  }, [privacy.businessId]);

  useEffect(() => {
    if (!attached.id || !privacy.businessId) {
      setFavorites([]);
      return;
    }
    let cancelled = false;
    const loadFavorites = async () => {
      try {
        const res = await fetch(
          `/api/pos/customers?customerId=${encodeURIComponent(attached.id!)}`,
          { headers: { "X-Business-Id": privacy.businessId! } },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { recentFavorites?: QuickPosCustomerFavoriteItem[] };
        if (!cancelled && Array.isArray(data.recentFavorites)) {
          setFavorites(data.recentFavorites);
        }
      } catch {
        // Ignore non-blocking favorite lookup errors
      }
    };
    void loadFavorites();
    return () => {
      cancelled = true;
    };
  }, [attached.id, privacy.businessId]);

  const shouldMask = privacy.protocol
    ? shouldMaskFromProtocol(privacy.protocol, privacy.manualEnabled, true)
    : true;

  const performLookup = async (rawQuery?: string) => {
    const searchValue = (rawQuery ?? queryInput).trim();
    if (!searchValue || !privacy.businessId) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const generation = ++requestGeneration.current;
    setLoading(true);
    setCreateError(null);
    const params = new URLSearchParams();
    params.set("search", searchValue);
    if (looksLikePhoneInput(searchValue)) {
      params.set("phone", searchValue);
    }

    try {
      const res = await fetch(`/api/pos/customers?${params.toString()}`, {
        headers: { "X-Business-Id": privacy.businessId },
      });
      const data = (await res.json()) as { items?: CustomerItem[] };
      if (generation !== requestGeneration.current) return;
      setResults(data.items || []);
      setHasSearched(true);
    } catch {
      if (generation !== requestGeneration.current) return;
      setResults([]);
      setHasSearched(true);
    } finally {
      if (generation === requestGeneration.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const trimmed = queryInput.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    const timer = window.setTimeout(() => {
      void performLookup(trimmed);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [queryInput, privacy.businessId]);

  const handleAttachCustomer = (item: CustomerItem) => {
    if (attached.id && attached.id !== item.id) {
      setPreviousCustomer({
        id: attached.id,
        phone: attached.phone,
        alias: attached.alias || "Customer",
        remainingCredit: attached.remainingCredit ?? 0,
        loyaltyTier: richAttached.loyaltyTier ?? undefined,
        discountRateBps: richAttached.discountRateBps,
        fixedPricePerGram: richAttached.fixedPricePerGram,
      });
    }
    onAttach(item as any);
    setResults([]);
    setHasSearched(false);
    setSwitchingCustomer(false);
    setQueryInput("");
    setSecondaryInput("");
    setCreateError(null);
  };

  const handleDetachCustomer = () => {
    if (attached.id) {
      setPreviousCustomer({
        id: attached.id,
        phone: attached.phone,
        alias: attached.alias || "Customer",
        remainingCredit: attached.remainingCredit ?? 0,
        loyaltyTier: richAttached.loyaltyTier ?? undefined,
        discountRateBps: richAttached.discountRateBps,
        fixedPricePerGram: richAttached.fixedPricePerGram,
      });
    }
    setSwitchingCustomer(false);
    onDetach?.();
  };

  const handleUndo = () => {
    if (!previousCustomer) return;
    const toRestore = previousCustomer;
    if (attached.id && attached.id !== toRestore.id) {
      setPreviousCustomer({
        id: attached.id,
        phone: attached.phone,
        alias: attached.alias || "Customer",
        remainingCredit: attached.remainingCredit ?? 0,
        loyaltyTier: richAttached.loyaltyTier ?? undefined,
        discountRateBps: richAttached.discountRateBps,
        fixedPricePerGram: richAttached.fixedPricePerGram,
      });
    } else {
      setPreviousCustomer(null);
    }
    onAttach(toRestore as any);
    setSwitchingCustomer(false);
  };

  const createInline = async () => {
    const primary = queryInput.trim();
    const secondary = secondaryInput.trim();
    if (!primary && !secondary) {
      setCreateError("Enter a customer name or phone number to create");
      return;
    }

    const isPrimaryPhone = looksLikePhoneInput(primary);
    const phone = isPrimaryPhone ? primary : secondary;
    const rawAlias = isPrimaryPhone ? secondary : primary;
    const alias = rawAlias ? toTitleCase(rawAlias) : rawAlias;

    const generation = ++requestGeneration.current;
    setLoading(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/pos/customers/quick-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Business-Id": privacy.businessId!,
        },
        body: JSON.stringify({
          ...(phone ? { phone } : {}),
          ...(alias ? { alias } : {}),
        }),
      });

      const data = (await res.json()) as CustomerItem & { error?: string };
      if (generation !== requestGeneration.current) return;
      if (!res.ok || !data.id) {
        setCreateError(data.error || "Could not create customer");
        setLoading(false);
        return;
      }
      handleAttachCustomer(data);
    } catch {
      if (generation !== requestGeneration.current) return;
      setCreateError("Could not create customer");
    } finally {
      if (generation === requestGeneration.current) {
        setLoading(false);
      }
    }
  };

  if (!privacy.protocol) {
    return (
      <section className="rounded-xl border border-white/10 bg-[#0A0A0A] p-4 shadow-sm" aria-live="polite">
        <h2 className="text-lg font-semibold text-white/90">Customer (Optional)</h2>
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="h-12 rounded-md bg-white/5 animate-pulse" />
            <div className="h-12 rounded-md bg-white/5 animate-pulse" />
          </div>
          {privacy.error ? (
            <div className="flex items-center justify-between text-xs text-red-400">
              <p>{privacy.error}</p>
              <button type="button" onClick={privacy.retry} className="underline hover:text-red-300">
                Retry
              </button>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  const showSearchForm = !attached.id || switchingCustomer;
  const isPhoneTyped = looksLikePhoneInput(queryInput);
  const discountPct =
    typeof richAttached.discountRateBps === "number" && richAttached.discountRateBps > 0
      ? Math.round((richAttached.discountRateBps / 100) * 10) / 10
      : null;

  return (
    <section className="rounded-xl border border-white/10 bg-[#0A0A0A] p-4 shadow-sm transition-all duration-200">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Customer</h2>
        {previousCustomer && (
          <button
            type="button"
            onClick={handleUndo}
            className="rounded border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
            aria-label="Undo customer change"
          >
            Undo ({shouldMask ? maskAlias(previousCustomer.alias || previousCustomer.phone) : previousCustomer.alias || previousCustomer.phone})
          </button>
        )}
      </div>

      {createError ? <p className="mt-2 text-sm text-red-300" role="alert">{createError}</p> : null}

      {attached.id ? (
        <div className="mt-2.5 space-y-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 transition-all">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-sm font-bold text-emerald-200">
                  Attached:{" "}
                  {shouldMask
                    ? maskAlias(attached.alias || attached.phone || "Customer")
                    : attached.alias || attached.phone || "Customer"}
                </p>
              </div>
              {attached.phone && attached.alias ? (
                <p className="mt-0.5 text-xs text-emerald-200/70">
                  {shouldMask ? `***-${attached.phone.slice(-4)}` : attached.phone}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSwitchingCustomer((prev) => !prev)}
                className="rounded border border-white/15 bg-black/40 px-2.5 py-1 text-xs font-medium text-white/90 hover:bg-white/10 transition"
              >
                {switchingCustomer ? "Cancel Switch" : "Switch"}
              </button>
              {onDetach && (
                <button
                  type="button"
                  onClick={handleDetachCustomer}
                  className="rounded border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20 transition"
                  aria-label="Remove customer"
                >
                  Detach
                </button>
              )}
            </div>
          </div>

          {/* Loyalty, Discount, VIP Price & Credit Perks */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {richAttached.loyaltyTier &&
              richAttached.loyaltyTier !== "none" &&
              richAttached.loyaltyTier !== "standard" && (
                <span className="rounded bg-amber-500/20 border border-amber-400/30 px-2 py-0.5 text-[11px] font-semibold uppercase text-amber-300">
                  {richAttached.loyaltyTier} Tier
                </span>
              )}
            {discountPct !== null && (
              <span className="rounded bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                {discountPct}% Loyalty Discount Active
              </span>
            )}
            {typeof richAttached.fixedPricePerGram === "number" &&
              richAttached.fixedPricePerGram > 0 && (
                <span className="rounded bg-purple-500/20 border border-purple-400/30 px-2 py-0.5 text-[11px] font-semibold text-purple-200">
                  VIP Rate: ${richAttached.fixedPricePerGram.toFixed(2)}/g
                </span>
              )}
            {typeof attached.remainingCredit === "number" && (
              <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] font-medium text-emerald-100">
                Credit: ${attached.remainingCredit.toFixed(2)}
              </span>
            )}
          </div>

          {/* Repeat Last Order / Customer Favorites */}
          {favorites.length > 0 && (
            <div className="border-t border-emerald-500/20 pt-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200/80 mb-1.5">
                Usual Items (Tap to Add)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {favorites.map((fav) => (
                  <button
                    key={fav.productId}
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent("drx:quick-pos-add-favorite", {
                          detail: fav,
                        }),
                      );
                    }}
                    className="rounded-md border border-emerald-400/30 bg-black/50 px-2.5 py-1 text-xs font-medium text-white hover:border-accent hover:text-accent transition"
                  >
                    + {fav.name} (${fav.unitPrice.toFixed(2)})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {showSearchForm && (
        <div className="mt-2.5 space-y-2">
          <div className="grid gap-2 md:grid-cols-2">
            <input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void performLookup();
                }
              }}
              placeholder="Search name, alias, or phone..."
              aria-label="Search customer by name or phone"
              className="h-11 rounded-md border border-white/15 bg-black/60 px-3 text-sm text-white placeholder:text-muted-foreground transition-colors focus:border-accent/60 focus:outline-none"
            />
            <input
              value={secondaryInput}
              onChange={(e) => setSecondaryInput(e.target.value)}
              placeholder={
                isPhoneTyped
                  ? "Name / Alias (optional for new)"
                  : "Phone (optional for new)"
              }
              aria-label="Secondary customer phone or alias"
              className="h-11 rounded-md border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-muted-foreground transition-colors focus:border-accent/60 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void performLookup()}
              className="h-11 rounded-md border border-white/10 bg-white/5 text-sm font-semibold transition hover:bg-white/10 active:scale-[0.99]"
            >
              {loading ? "Searching..." : "Lookup"}
            </button>
            <button
              type="button"
              onClick={() => void createInline()}
              disabled={!queryInput.trim() && !secondaryInput.trim()}
              className="h-11 rounded-md bg-accent text-sm font-semibold text-black transition hover:bg-accent/90 active:scale-[0.99] disabled:opacity-40"
            >
              Quick Create
            </button>
          </div>

          {createError && (
            <p className="text-xs text-red-400" role="alert">
              {createError}
            </p>
          )}

          {hasSearched && !loading && results.length === 0 && queryInput.trim() ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-amber-200">
                    Customer not found for &ldquo;{queryInput.trim()}&rdquo;
                  </p>
                  <p className="text-xs text-amber-200/70">
                    Create and attach a new profile with one tap using this{" "}
                    {isPhoneTyped ? "phone number" : "name/alias"}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void createInline()}
                  className="shrink-0 rounded-md bg-accent px-3 py-2 text-xs font-bold text-black hover:bg-accent/90 transition"
                >
                  + Create &ldquo;{queryInput.trim()}&rdquo;
                </button>
              </div>
            </div>
          ) : null}

          {results.length > 0 && (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pt-1">
              {results.map((item) => {
                const itemDiscountPct =
                  typeof item.discountRateBps === "number" && item.discountRateBps > 0
                    ? Math.round((item.discountRateBps / 100) * 10) / 10
                    : null;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAttachCustomer(item)}
                    className="flex w-full items-center justify-between rounded-md border border-white/10 bg-black/50 px-3 py-2.5 text-left transition hover:border-accent/40 hover:bg-accent/10 active:scale-[0.99]"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-white truncate">
                        {shouldMask ? maskAlias(item.alias) : item.alias}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {item.phone ? (
                          <span>
                            {shouldMask ? `***-${item.phone.slice(-4)}` : item.phone}
                          </span>
                        ) : null}
                        {item.loyaltyTier &&
                          item.loyaltyTier !== "none" &&
                          item.loyaltyTier !== "standard" && (
                            <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-semibold uppercase text-amber-300">
                              {item.loyaltyTier}
                            </span>
                          )}
                        {itemDiscountPct !== null && (
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-300">
                            {itemDiscountPct}% off
                          </span>
                        )}
                        {typeof item.fixedPricePerGram === "number" &&
                          item.fixedPricePerGram > 0 && (
                            <span className="rounded bg-purple-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-purple-300">
                              ${item.fixedPricePerGram.toFixed(2)}/g VIP
                            </span>
                          )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="block text-xs font-medium text-emerald-300">
                        Attach
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Credit ${item.remainingCredit.toFixed(2)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

