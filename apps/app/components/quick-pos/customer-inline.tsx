"use client";

import { useEffect, useState } from "react";
import { getDefaultPrivacyProtocol } from "@/lib/privacy/profiles";
import type { PrivacyProtocolSettings } from "@/lib/privacy/types";
import {
  maskAlias,
  shouldMaskFromProtocol,
} from "@/lib/privacy/masking";

interface CustomerItem {
  id: string;
  phone: string;
  alias: string;
  remainingCredit: number;
}

export function CustomerInline({
  attached,
  onAttach,
}: {
  attached: { id: string | null; phone: string; alias: string | null; remainingCredit?: number };
  onAttach: (value: { id: string; phone: string; alias: string; remainingCredit: number }) => void;
}) {
  const [phone, setPhone] = useState(attached.phone || "");
  const [alias, setAlias] = useState("");
  const [results, setResults] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [privacyProtocol, setPrivacyProtocol] =
    useState<PrivacyProtocolSettings>(getDefaultPrivacyProtocol());
  const [manualScreenPrivacyEnabled, setManualScreenPrivacyEnabled] =
    useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/business/settings").then((res) => res.json()),
      fetch("/api/privacy/protexion/preferences").then((res) => res.json()),
    ])
      .then(([settingsData, preferenceData]) => {
        setPrivacyProtocol(
          settingsData.privacy_protocol ||
            settingsData.privacyProtocol ||
            getDefaultPrivacyProtocol(),
        );
        setManualScreenPrivacyEnabled(!!preferenceData?.manual_enabled);
      })
      .catch((error) => {
        console.error("Failed to load ProteXion settings", error);
      });
  }, []);

  const shouldMask = shouldMaskFromProtocol(
    privacyProtocol,
    manualScreenPrivacyEnabled,
    true,
  );

  const lookup = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/pos/customers?phone=${encodeURIComponent(phone)}`);
    const data = (await res.json()) as { items?: CustomerItem[] };
    setResults(data.items || []);
    setLoading(false);
  };

  const createInline = async () => {
    if (!phone.trim()) return;
    setLoading(true);

    const res = await fetch("/api/pos/customers/quick-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, alias }),
    });

    const data = (await res.json()) as CustomerItem;
    if (data.id) {
      onAttach(data);
      setResults([]);
    }

    setLoading(false);
  };

  return (
    <section className="rounded-xl border border-white/10 bg-[#0A0A0A] p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Customer (Optional)</h2>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number"
          className="h-12 rounded-md border border-white/10 bg-black/50 px-3 text-lg placeholder:text-muted-foreground"
        />
        <input
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder="Alias"
          className="h-12 rounded-md border border-white/10 bg-black/50 px-3 text-lg placeholder:text-muted-foreground"
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={lookup}
          className="h-12 rounded-md border border-white/10 bg-white/5 text-base font-semibold hover:bg-white/10"
        >
          {loading ? "Searching..." : "Lookup"}
        </button>
        <button
          type="button"
          onClick={createInline}
          className="h-12 rounded-md bg-accent text-base font-semibold text-black hover:bg-accent/90"
        >
          Quick Create
        </button>
      </div>

      {attached.id ? (
        <p className="mt-2 text-sm font-semibold text-emerald-300">
          Attached:{" "}
          {shouldMask
            ? maskAlias(attached.alias || attached.phone)
            : attached.alias || attached.phone}
        </p>
      ) : null}

      <div className="mt-2 space-y-2">
        {results.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onAttach(item)}
            className="flex h-12 w-full items-center justify-between rounded-md border border-white/10 bg-black/40 px-3 hover:border-accent/30 hover:bg-accent/5"
          >
            <span>{shouldMask ? maskAlias(item.alias) : item.alias}</span>
            <span className="text-sm text-muted-foreground">Credit ${item.remainingCredit.toFixed(2)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
