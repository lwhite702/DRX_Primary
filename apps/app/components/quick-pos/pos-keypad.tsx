"use client";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

export function PosKeypad({
  value,
  onChange,
  onAdd,
}: {
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
}) {
  const press = (key: string) => {
    if (key === "⌫") {
      onChange(value.slice(0, -1));
      return;
    }

    if (key === "." && value.includes(".")) return;
    onChange(value + key);
  };

  return (
    <section className="rounded-xl border border-white/10 bg-[#0A0A0A] p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Manual Price</h2>
      <div className="mt-2 h-14 rounded-md border border-white/10 bg-black/50 px-4 text-3xl font-bold leading-[56px]">
        <span className="text-accent">${value || "0"}</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            className="h-14 rounded-md border border-white/10 bg-black/40 text-2xl font-semibold transition hover:border-accent/30 hover:bg-accent/5 active:scale-[0.99]"
          >
            {key}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onAdd}
        disabled={Number(value || 0) <= 0}
        className="mt-3 h-14 w-full rounded-md bg-accent text-xl font-bold text-black hover:bg-accent/90 disabled:opacity-50"
      >
        Add Manual Item
      </button>
    </section>
  );
}
