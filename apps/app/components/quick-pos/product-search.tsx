"use client";

interface ProductItem {
  id: string;
  name: string;
  price: number;
  quantity_on_hand: number;
}

export function ProductSearch({
  value,
  onChange,
  items,
  onAdd,
}: {
  value: string;
  onChange: (value: string) => void;
  items: ProductItem[];
  onAdd: (item: ProductItem) => void;
}) {
  return (
    <section className="rounded-md border border-neutral-800 bg-neutral-950 p-4">
      <label className="text-sm font-semibold text-neutral-200">Product Search</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search products"
        className="mt-2 h-14 w-full rounded-md border border-neutral-700 bg-black px-4 text-2xl text-white"
      />

      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onAdd(item)}
            className="flex h-16 items-center justify-between rounded-md border border-neutral-700 bg-black px-4 text-left active:scale-[0.99]"
          >
            <span className="text-xl font-semibold">{item.name}</span>
            <span className="text-xl">${item.price.toFixed(2)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
