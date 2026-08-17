"use client";

interface QuickItem {
  id: string;
  name: string;
  price: number;
  quantity_on_hand: number;
}

export function QuickGrid({
  title,
  items,
  onAdd,
}: {
  title: string;
  items: QuickItem[];
  onAdd: (item: QuickItem) => void;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#0A0A0A] p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onAdd(item)}
            className="min-h-24 rounded-md border border-white/10 bg-black/40 p-3 text-left transition hover:border-accent/30 hover:bg-accent/5 active:scale-[0.99]"
          >
            <div className="line-clamp-2 text-base font-semibold">
              {item.name}
            </div>
            <div className="mt-2 text-xl font-bold text-accent">
              ${item.price.toFixed(2)}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
