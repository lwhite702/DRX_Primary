"use client";

interface ProductItem {
  id: string;
  name: string;
  price: number;
  quantity_on_hand: number;
  sku?: string | null;
  barcode?: string | null;
}

export function ProductSearch({
  value,
  onChange,
  items,
  onAdd,
  onSubmitSearch,
}: {
  value: string;
  onChange: (value: string) => void;
  items: ProductItem[];
  onAdd: (item: ProductItem) => void;
  onSubmitSearch?: () => void;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#0A0A0A] p-4 shadow-sm">
      <label className="text-sm font-semibold text-white">Product Search</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmitSearch?.();
          }
        }}
        placeholder="Scan SKU / barcode or search products"
        className="mt-2 h-14 w-full rounded-md border border-white/10 bg-black/50 px-4 text-xl md:text-2xl text-white placeholder:text-muted-foreground focus:border-accent/50 focus:outline-none"
      />

      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onAdd(item)}
            className="flex min-h-16 items-center justify-between rounded-md border border-white/10 bg-black/40 px-4 text-left transition hover:border-accent/30 hover:bg-accent/5 active:scale-[0.99]"
          >
            <div>
              <span className="text-xl font-semibold">{item.name}</span>
              {item.sku ? (
                <p className="text-xs text-muted-foreground">SKU {item.sku}</p>
              ) : null}
            </div>
            <span className="text-xl font-semibold text-accent">${item.price.toFixed(2)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
