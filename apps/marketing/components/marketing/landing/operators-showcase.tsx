import { FeatureStatusChip } from "@/components/marketing/site/feature-status-chip";
import {
  operatorShowcaseCanon,
  type OperatorShowcaseCardId,
} from "@/lib/feature-canon";

const cardLayout: Record<OperatorShowcaseCardId, string> = {
  "point-of-sale": "md:col-span-8 md:row-span-1",
  inventory: "md:col-span-4 md:row-span-1",
  "credit-fronts": "md:col-span-4 md:row-span-1",
  customers: "md:col-span-4 md:row-span-1",
  pricing: "md:col-span-4 md:row-span-1",
  "anywhere-access": "md:col-span-8 md:row-span-1",
  "audit-control": "md:col-span-4 md:row-span-1",
};

function PosShowcaseSurface() {
  return (
    <div className="operator-showcase-surface mx-auto max-w-[430px]">
      <div className="operator-showcase-header">
        <p className="operator-showcase-mono">DRX POS</p>
        <div className="flex items-center gap-1.5 text-[10px] text-white/45">
          <span className="operator-showcase-status-dot" />
          ONLINE
        </div>
      </div>

      <div className="space-y-2 p-3">
        <div className="operator-showcase-row">
          <div>
            <p className="operator-showcase-title">Premium Service</p>
            <p className="operator-showcase-muted-label">$120.00</p>
          </div>
          <p className="operator-showcase-title">1</p>
        </div>
        <div className="operator-showcase-row">
          <div>
            <p className="operator-showcase-title">Standard Unit</p>
            <p className="operator-showcase-muted-label">$45.00</p>
          </div>
          <p className="operator-showcase-title">2</p>
        </div>
      </div>

      <div className="operator-showcase-divider" />

      <div className="space-y-1.5 px-3 pb-3 text-xs">
        <div className="flex items-center justify-between text-white/55">
          <span>Subtotal</span>
          <span>$210.00</span>
        </div>
        <div className="flex items-center justify-between text-white/55">
          <span>Tax (8%)</span>
          <span>$16.80</span>
        </div>
        <div className="flex items-center justify-between text-sm font-semibold text-white">
          <span>Total</span>
          <span>$226.80</span>
        </div>
      </div>

      <div className="px-3 pb-3">
        <button type="button" className="w-full rounded-md bg-[#00bc7d] py-2 text-xs font-semibold text-black">
          Charge $226.80
        </button>
      </div>
    </div>
  );
}

function InventoryShowcaseSurface() {
  return (
    <div className="operator-showcase-surface">
      <div className="operator-showcase-header">
        <p className="operator-showcase-mono">Inventory</p>
        <div className="flex items-center gap-1 text-[10px] text-white/55">
          <span className="rounded-sm border border-white/20 px-1.5 py-0.5">Bulk Adjust</span>
          <span className="rounded-sm bg-neon-lime/80 px-1.5 py-0.5 text-black">Add Item</span>
        </div>
      </div>
      <div className="grid grid-cols-[1.8fr,0.7fr,0.7fr] gap-2 border-b border-white/10 px-3 py-2 text-[10px] uppercase text-white/45">
        <span>Item</span>
        <span className="text-right">Stock</span>
        <span className="text-right">Status</span>
      </div>
      <div className="space-y-1.5 p-3 text-[11px]">
        {[
          ["Filter Unit A", "42", "OK"],
          ["Filter Unit B", "8", "Low"],
          ["Connector Set", "156", "OK"],
          ["Power Module", "0", "Out"],
        ].map(([name, qty, state]) => (
          <div key={name} className="grid grid-cols-[1.8fr,0.7fr,0.7fr] items-center gap-2 text-white/80">
            <span>{name}</span>
            <span className="text-right">{qty}</span>
            <span
              className={`justify-self-end rounded-full px-1.5 py-0.5 text-[10px] ${
                state === "OK"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : state === "Low"
                    ? "bg-amber-500/15 text-amber-300"
                    : "bg-rose-500/15 text-rose-300"
              }`}
            >
              {state}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreditShowcaseSurface() {
  return (
    <div className="operator-showcase-surface">
      <div className="operator-showcase-header">
        <p className="operator-showcase-title">Apex Motors</p>
        <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] text-white/60">
          Net 30
        </span>
      </div>
      <div className="p-3">
        <p className="operator-showcase-muted-label text-center">Current Balance</p>
        <p className="text-center text-3xl font-bold text-white">$1,850.00</p>
        <p className="mt-1 text-center text-[10px] text-white/55">Limit $2,000</p>
        <div className="mt-3 h-1.5 rounded-full bg-white/10">
          <div className="h-full w-[92%] rounded-full bg-neon-lime/80" />
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" className="flex-1 rounded-md border border-white/15 bg-white/5 py-1.5 text-xs text-white/80">
            History
          </button>
          <button type="button" className="flex-1 rounded-md bg-white py-1.5 text-xs font-semibold text-black">
            Record Payment
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomersShowcaseSurface() {
  return (
    <div className="operator-showcase-surface">
      <div className="operator-showcase-header">
        <p className="operator-showcase-title">John Doe</p>
        <span className="text-[10px] text-neon-lime">Edit</span>
      </div>
      <div className="space-y-2 p-3 text-[11px] text-white/75">
        <p>+1 (555) 012-3456</p>
        <p>j.doe@example.com</p>
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] text-amber-200">
          Internal note: Prefers morning deliveries. Authorized for pickup.
        </div>
        <div className="operator-showcase-divider" />
        <div className="space-y-1 text-[10px] text-white/55">
          <div className="flex items-center justify-between">
            <span>Order #2041</span>
            <span>$124.50</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Order #2042</span>
            <span>$124.50</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Order #2043</span>
            <span>$124.50</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingShowcaseSurface() {
  return (
    <div className="operator-showcase-surface">
      <div className="operator-showcase-header">
        <p className="operator-showcase-mono">Margin Calculator</p>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 text-[11px]">
        <div className="rounded-md border border-white/10 bg-black/40 p-2">
          <p className="operator-showcase-muted-label">Unit Cost</p>
          <p className="operator-showcase-title">$45</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/40 p-2">
          <p className="operator-showcase-muted-label">Sale Price</p>
          <p className="operator-showcase-title">$89</p>
        </div>
      </div>
      <div className="operator-showcase-divider" />
      <div className="flex items-end justify-between px-3 py-2 text-xs">
        <div>
          <p className="operator-showcase-muted-label">Profit / Unit</p>
          <p className="text-lg font-semibold text-[#00bc7d]">$44.00</p>
        </div>
        <div className="text-right">
          <p className="operator-showcase-muted-label">Margin</p>
          <p className="text-lg font-semibold text-[#00bc7d]">49.4%</p>
        </div>
      </div>
      <div className="px-3 pb-3">
        <button type="button" className="w-full rounded-md bg-white py-1.5 text-xs font-semibold text-black">
          Update Pricing
        </button>
      </div>
    </div>
  );
}

function AnywhereAccessShowcaseSurface() {
  return (
    <div className="grid gap-3 p-2 md:grid-cols-2">
      <div className="operator-showcase-surface">
        <div className="operator-showcase-header">
          <p className="operator-showcase-mono">Desktop</p>
        </div>
        <div className="space-y-2 p-3 text-[11px] text-white/70">
          <div className="h-6 rounded bg-white/10" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-16 rounded bg-neon-lime/10" />
            <div className="h-16 rounded bg-white/10" />
          </div>
          <div className="h-4 w-2/3 rounded bg-white/10" />
        </div>
      </div>
      <div className="operator-showcase-surface mx-auto w-[170px]">
        <div className="operator-showcase-header">
          <p className="operator-showcase-mono">Mobile</p>
        </div>
        <div className="space-y-2 p-3 text-[11px] text-white/70">
          <div className="h-8 rounded bg-neon-lime/10" />
          <div className="h-14 rounded bg-white/10" />
          <div className="h-8 rounded bg-[#00bc7d] text-center text-xs font-semibold leading-8 text-black">
            New Sale
          </div>
        </div>
      </div>
    </div>
  );
}

function AuditShowcaseSurface() {
  return (
    <div className="operator-showcase-surface">
      <div className="operator-showcase-header">
        <p className="operator-showcase-mono">Audit Log</p>
        <p className="text-[10px] text-white/50">Export CSV</p>
      </div>
      <div className="grid grid-cols-[1fr,1.1fr,0.6fr] gap-2 border-b border-white/10 px-3 py-2 text-[10px] uppercase text-white/40">
        <span>User</span>
        <span>Action</span>
        <span className="text-right">Time</span>
      </div>
      <div className="space-y-1.5 p-3 text-[11px] text-white/75">
        {[
          ["Admin User", "Viewed Credit Report", "10:42"],
          ["Staff Member", "Processed Payment", "10:38"],
          ["System", "Inventory Sync", "10:30"],
          ["Staff Member", "Updated Stock", "09:15"],
        ].map(([user, action, time]) => (
          <div key={`${user}-${action}`} className="grid grid-cols-[1fr,1.1fr,0.6fr] gap-2">
            <span>{user}</span>
            <span>{action}</span>
            <span className="text-right text-white/55">{time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderShowcaseSurface(cardId: OperatorShowcaseCardId) {
  switch (cardId) {
    case "point-of-sale":
      return <PosShowcaseSurface />;
    case "inventory":
      return <InventoryShowcaseSurface />;
    case "credit-fronts":
      return <CreditShowcaseSurface />;
    case "customers":
      return <CustomersShowcaseSurface />;
    case "pricing":
      return <PricingShowcaseSurface />;
    case "anywhere-access":
      return <AnywhereAccessShowcaseSurface />;
    case "audit-control":
      return <AuditShowcaseSurface />;
    default:
      return null;
  }
}

export function OperatorsShowcaseSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-20">
      <div className="mb-10 flex flex-col items-center text-center">
        <h2 className="font-sans text-[clamp(2rem,5vw,3.75rem)] font-bold tracking-[-0.045em] text-white">
          {operatorShowcaseCanon.heading}
        </h2>
        <p className="mt-3 text-sm text-white/65">{operatorShowcaseCanon.supportingLines[0]}</p>
        <p className="text-sm text-white/65">{operatorShowcaseCanon.supportingLines[1]}</p>
        <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/35">
          {operatorShowcaseCanon.eyebrow}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        {operatorShowcaseCanon.cards.map((card) => (
          <article
            key={card.id}
            className={`operator-showcase-card rounded-2xl p-4 ${cardLayout[card.id]}`}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">{card.title}</h3>
                <p className="mt-1 text-xs text-white/55">{card.subtitle}</p>
              </div>
              <FeatureStatusChip status={card.status} />
            </div>
            {renderShowcaseSurface(card.id)}
          </article>
        ))}
      </div>
    </section>
  );
}
