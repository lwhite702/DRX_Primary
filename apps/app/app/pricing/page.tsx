export default function PricingPage() {
  const plans = [
    {
      name: "Starter",
      price: "$49/mo",
      description: "Single location, POS + inventory essentials.",
    },
    {
      name: "Growth",
      price: "$149/mo",
      description: "Multi-user workflows, customer credit, and reporting.",
    },
    {
      name: "Scale",
      price: "Contact sales",
      description: "Advanced automations, AI intelligence, and tailored rollout support.",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">Pricing</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Plans built for operational teams that need reliable checkout and inventory control.
      </p>
      <div className="grid w-full max-w-4xl gap-4 md:grid-cols-3 text-left">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold">{plan.name}</h2>
            <p className="mt-2 text-2xl font-bold">{plan.price}</p>
            <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
