export default function FeaturesPage() {
  const featureGroups = [
    {
      title: "Operations",
      items: ["Fast POS checkout", "Inventory intake + adjustments", "Reorder awareness"],
    },
    {
      title: "Customer",
      items: ["Credit profiles", "Risk-aware selling controls", "Order history lookups"],
    },
    {
      title: "Control",
      items: ["Admin audit visibility", "Feature and rollout gates", "Business-level settings"],
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">Features</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Core capabilities designed for teams running inventory-sensitive operations.
      </p>
      <div className="grid w-full max-w-5xl gap-4 md:grid-cols-3 text-left">
        {featureGroups.map((group) => (
          <section key={group.title} className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">{group.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {group.items.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
