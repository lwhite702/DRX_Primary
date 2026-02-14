"use client";

interface QuickItem {
  id: string;
  name: string;
  price: number;
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
    <section className="rounded-md border border-neutral-800 bg-neutral-950 p-4">
      <h2 className="text-lg font-semibold text-neutral-100">{title}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onAdd(item)}
            className="min-h-24 rounded-md border border-neutral-700 bg-black p-3 text-left active:scale-[0.99]"
          >
            <div className="line-clamp-2 text-base font-semibold">{item.name}</div>
            <div className="mt-2 text-xl font-bold">${item.price.toFixed(2)}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
