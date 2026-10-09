"use client";

import { useEffect, useRef, useState } from "react";
import { usePrivacyContext } from "@/lib/privacy/use-privacy-context";
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
  onDetach,
}: {
  attached: { id: string | null; phone: string; alias: string | null; remainingCredit?: number };
  onAttach: (value: { id: string; phone: string; alias: string; remainingCredit: number }) => void;
  onDetach?: () => void;
}) {
  const [phone, setPhone] = useState(attached.phone || "");
  const [alias, setAlias] = useState("");
  const [results, setResults] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const privacy = usePrivacyContext();
  const requestGeneration = useRef(0);
  useEffect(() => {
    requestGeneration.current += 1;
    setResults([]); setPhone(""); setAlias(""); setLoading(false);
  }, [privacy.businessId]);
  const shouldMask = privacy.protocol ? shouldMaskFromProtocol(privacy.protocol, privacy.manualEnabled, true) : true;

  const lookup = async () => {
    const phoneValue = phone.trim();
    const aliasValue = alias.trim();
    const searchValue = aliasValue || phoneValue;

    if (!searchValue) return;

    const generation = ++requestGeneration.current;
    setLoading(true);
    const params = new URLSearchParams();
    params.set("search", searchValue);
    if (phoneValue) params.set("phone", phoneValue);

    const res = await fetch(`/api/pos/customers?${params.toString()}`, { headers: { "X-Business-Id": privacy.businessId! } });
    const data = (await res.json()) as { items?: CustomerItem[] };
    if (generation !== requestGeneration.current) return;
    setResults(data.items || []);
    setLoading(false);
  };

  const createInline = async () => {
    if (!phone.trim()) return;
    const generation = ++requestGeneration.current;
    setLoading(true);

    const res = await fetch("/api/pos/customers/quick-create", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Business-Id": privacy.businessId! },
      body: JSON.stringify({ phone, alias }),
    });

    const data = (await res.json()) as CustomerItem;
    if (generation !== requestGeneration.current) return;
    if (data.id) {
      onAttach(data);
      setResults([]);
    }

    setLoading(false);
  };

  if (!privacy.protocol) return (
    <section className="rounded-xl border p-4" aria-live="polite">
      <p>{privacy.error ?? "Loading customer privacy settings…"}</p>
      {privacy.error && <button type="button" onClick={privacy.retry} className="underline">Retry privacy settings</button>}
    </section>
  );

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
        <div className="mt-2 flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
          <p className="text-sm font-semibold text-emerald-300">
            Attached:{" "}
            {shouldMask
              ? maskAlias(attached.alias || attached.phone)
              : attached.alias || attached.phone}
            {typeof attached.remainingCredit === "number" ? (
              <span className="ml-2 text-xs font-normal text-emerald-200/80">
                (Credit: ${attached.remainingCredit.toFixed(2)})
              </span>
            ) : null}
          </p>
          {onDetach && (
            <button
              type="button"
              onClick={onDetach}
              className="text-xs text-red-400 hover:text-red-300 transition underline ml-2"
              aria-label="Remove customer"
            >
              Remove
            </button>
          )}
        </div>
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
