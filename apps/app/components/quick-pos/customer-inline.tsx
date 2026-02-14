"use client";

import { useState } from "react";

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
    <section className="rounded-md border border-neutral-800 bg-neutral-950 p-4">
      <h2 className="text-lg font-semibold">Customer (Optional)</h2>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number"
          className="h-12 rounded-md border border-neutral-700 bg-black px-3 text-lg"
        />
        <input
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder="Alias"
          className="h-12 rounded-md border border-neutral-700 bg-black px-3 text-lg"
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={lookup}
          className="h-12 rounded-md border border-neutral-700 bg-black text-base font-semibold"
        >
          {loading ? "Searching..." : "Lookup"}
        </button>
        <button
          type="button"
          onClick={createInline}
          className="h-12 rounded-md bg-white text-base font-semibold text-black"
        >
          Quick Create
        </button>
      </div>

      {attached.id ? (
        <p className="mt-2 text-sm font-semibold text-emerald-300">
          Attached: {attached.alias || attached.phone}
        </p>
      ) : null}

      <div className="mt-2 space-y-2">
        {results.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onAttach(item)}
            className="flex h-12 w-full items-center justify-between rounded-md border border-neutral-700 bg-black px-3"
          >
            <span>{item.alias}</span>
            <span className="text-sm text-neutral-300">Credit ${item.remainingCredit.toFixed(2)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
