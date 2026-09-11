import Image from "next/image";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  LayoutDashboard,
  Menu,
  PackagePlus,
  Search,
  ShieldCheck,
  ShoppingCart,
  TriangleAlert,
  UserPlus,
  Users,
} from "lucide-react";

const screens = ["dashboard", "pos-sale", "inventory", "customers"] as const;

export type OperatorFixtureScreen = (typeof screens)[number];

export function isOperatorFixtureScreen(
  value: string,
): value is OperatorFixtureScreen {
  return screens.includes(value as OperatorFixtureScreen);
}

const navigation = [
  { label: "Home", screen: "dashboard", icon: LayoutDashboard },
  { label: "New sale", screen: "pos-sale", icon: ShoppingCart },
  { label: "Products", screen: "inventory", icon: Boxes },
  { label: "Customers", screen: "customers", icon: Users },
] as const;

const products = [
  { name: "Northstar Sparkling", sku: "NS-12-LME", stock: 24, price: "$36.00" },
  {
    name: "Night Shift Cold Brew",
    sku: "CB-08-BLK",
    stock: 11,
    price: "$28.00",
  },
  { name: "District Energy Pack", sku: "DE-24-ORG", stock: 7, price: "$52.00" },
];

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "info";
}) {
  const toneClass = {
    neutral: "border-white/10 bg-white/[0.04] text-zinc-300",
    success: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    warning: "border-amber-400/25 bg-amber-400/10 text-amber-300",
    info: "border-blue-400/25 bg-blue-400/10 text-blue-300",
  }[tone];

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ${toneClass}`}
    >
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
  direction = "up",
}: {
  label: string;
  value: string;
  detail: string;
  direction?: "up" | "down";
}) {
  const DirectionIcon = direction === "up" ? ArrowUpRight : ArrowDownRight;

  return (
    <article className="rounded-xl border border-white/10 bg-[#121212] p-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          {label}
        </p>
        <DirectionIcon
          className={`size-4 ${direction === "up" ? "text-emerald-400" : "text-amber-400"}`}
          aria-hidden="true"
        />
      </div>
      <p className="mt-4 font-mono text-3xl font-semibold tracking-tight text-[#f5f5f5]">
        {value}
      </p>
      <p className="mt-2 text-xs text-zinc-500">{detail}</p>
    </article>
  );
}

function DashboardFixture() {
  return (
    <>
      <FixtureHeader
        eyebrow="Live operation"
        title="Home"
        description="Revenue, stock risk, and the next actions that keep the shift moving."
        action="New sale"
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Revenue today"
          value="$8,420"
          detail="32 completed sales"
        />
        <MetricCard
          label="Avg. ticket"
          value="$263.13"
          detail="+8.4% from last Thursday"
        />
        <MetricCard
          label="Items moved"
          value="147"
          detail="19 SKUs across all sales"
        />
        <MetricCard
          label="Stock alerts"
          value="03"
          detail="Action needed before close"
          direction="down"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <article className="rounded-xl border border-white/10 bg-[#121212]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-sm font-semibold">Moving today</p>
              <p className="mt-1 text-xs text-zinc-500">
                Top products by gross sales
              </p>
            </div>
            <StatusPill tone="success">Live</StatusPill>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {products.map((product, index) => (
              <div
                key={product.sku}
                className="grid grid-cols-[32px_1fr_auto] items-center gap-3 px-5 py-4"
              >
                <span className="font-mono text-xs text-zinc-600">
                  0{index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                    {product.sku}
                  </p>
                </div>
                <p className="font-mono text-sm text-[#ccff00]">
                  {["$1,944", "$1,232", "$936"][index]}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-white/10 bg-[#121212] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold">Needs attention</p>
              <p className="mt-1 text-xs text-zinc-500">
                Prioritized for this shift
              </p>
            </div>
            <TriangleAlert
              className="size-5 text-amber-400"
              aria-hidden="true"
            />
          </div>
          <div className="mt-5 space-y-3">
            {[
              ["District Energy Pack", "7 left", "Restock"],
              ["Register 02", "$18 variance", "Review"],
              ["Night Shift Cold Brew", "11 left", "Watch"],
            ].map(([title, detail, status], index) => (
              <div
                key={title}
                className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-black/30 p-3"
              >
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    {detail}
                  </p>
                </div>
                <StatusPill tone={index === 0 ? "warning" : "neutral"}>
                  {status}
                </StatusPill>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}

function PosFixture() {
  return (
    <>
      <FixtureHeader
        eyebrow="Register 01 · Online"
        title="New sale"
        description="Search or scan. Add. Done."
        action="Hold order"
        compact
      />

      <section className="grid min-h-[650px] gap-4 xl:grid-cols-[1.45fr_0.75fr]">
        <div className="space-y-4">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-zinc-500"
              aria-hidden="true"
            />
            <span className="sr-only">Search products</span>
            <input
              readOnly
              value=""
              placeholder="Scan SKU / barcode or search products"
              className="h-14 w-full rounded-lg border border-white/10 bg-[#121212] pl-12 pr-4 text-base outline-none placeholder:text-zinc-600"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {products
              .concat([
                {
                  name: "Metro Citrus Case",
                  sku: "MC-12-CTR",
                  stock: 18,
                  price: "$42.00",
                },
              ])
              .map((product, index) => (
                <article
                  key={product.sku}
                  className="group flex min-h-36 flex-col justify-between rounded-xl border border-white/10 bg-[#121212] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <StatusPill
                      tone={product.stock < 10 ? "warning" : "neutral"}
                    >
                      {product.stock} on hand
                    </StatusPill>
                    <span className="font-mono text-sm text-zinc-400">
                      {product.price}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                      {product.sku}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`mt-4 h-10 rounded-md text-sm font-semibold ${
                      index === 0
                        ? "bg-[#ccff00] text-black"
                        : "border border-white/10 bg-white/[0.04] text-zinc-200"
                    }`}
                  >
                    {index === 0 ? "Added · 2" : "Add to cart"}
                  </button>
                </article>
              ))}
          </div>
        </div>

        <aside className="flex h-fit flex-col rounded-xl border border-white/10 bg-[#121212] xl:sticky xl:top-4">
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <div>
              <p className="font-semibold">Current sale</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Order DRX-1048
              </p>
            </div>
            <StatusPill>3 items</StatusPill>
          </div>
          <div className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Northstar Sparkling</p>
                <p className="mt-1 font-mono text-xs text-zinc-500">
                  2 × $36.00
                </p>
              </div>
              <p className="font-mono text-sm">$72.00</p>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Night Shift Cold Brew</p>
                <p className="mt-1 font-mono text-xs text-zinc-500">
                  1 × $28.00
                </p>
              </div>
              <p className="font-mono text-sm">$28.00</p>
            </div>
          </div>
          <div className="mt-auto border-t border-white/10 p-5">
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal</span>
                <span>$100.00</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Tax</span>
                <span>$8.25</span>
              </div>
              <div className="flex justify-between pt-3 text-xl font-semibold text-white">
                <span>Total</span>
                <span>$108.25</span>
              </div>
            </div>
            <button
              type="button"
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#ccff00] font-semibold text-black"
            >
              <CreditCard className="size-4" aria-hidden="true" />
              Continue to payment
            </button>
          </div>
        </aside>
      </section>
    </>
  );
}

function InventoryFixture() {
  return (
    <>
      <FixtureHeader
        eyebrow="147 active products"
        title="Products"
        description="Know what’s left and what needs attention."
        action="Add stock"
      />
      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Stock value"
          value="$42,680"
          detail="At current unit cost"
        />
        <MetricCard
          label="Units on hand"
          value="1,284"
          detail="Across 147 active SKUs"
        />
        <MetricCard
          label="Low stock"
          value="01"
          detail="1 item below reorder point"
          direction="down"
        />
      </section>
      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#121212]">
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
              aria-hidden="true"
            />
            <span className="sr-only">Search products</span>
            <input
              readOnly
              placeholder="Search name, SKU, or barcode"
              className="h-10 w-full rounded-md border border-white/10 bg-black/30 pl-10 pr-3 text-sm placeholder:text-zinc-600"
            />
          </label>
          <div className="flex gap-2">
            <StatusPill tone="warning">1 low stock</StatusPill>
            <StatusPill>All locations</StatusPill>
          </div>
        </div>
        <div className="hidden grid-cols-[1.5fr_0.7fr_0.55fr_0.55fr_40px] gap-3 border-b border-white/[0.06] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600 md:grid">
          <span>Product</span>
          <span>SKU</span>
          <span>On hand</span>
          <span>Unit price</span>
          <span />
        </div>
        <div className="divide-y divide-white/[0.06]">
          {products
            .concat([
              {
                name: "Metro Citrus Case",
                sku: "MC-12-CTR",
                stock: 18,
                price: "$42.00",
              },
              {
                name: "After Hours Tonic",
                sku: "AH-06-TNC",
                stock: 39,
                price: "$24.00",
              },
            ])
            .map((product) => (
              <div
                key={product.sku}
                className="grid gap-3 px-5 py-4 md:grid-cols-[1.5fr_0.7fr_0.55fr_0.55fr_40px] md:items-center"
              >
                <div>
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-zinc-600 md:hidden">
                    {product.sku}
                  </p>
                </div>
                <span className="hidden font-mono text-xs text-zinc-500 md:block">
                  {product.sku}
                </span>
                <StatusPill tone={product.stock < 10 ? "warning" : "success"}>
                  {product.stock} units
                </StatusPill>
                <span className="font-mono text-sm">{product.price}</span>
                <button
                  type="button"
                  aria-label={`Open ${product.name}`}
                  className="hidden size-9 items-center justify-center rounded-md border border-white/10 text-zinc-500 md:flex"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))}
        </div>
      </section>
    </>
  );
}

function CustomersFixture() {
  const customers = [
    ["Maya R.", "MR-0291", "18 orders", "$4,860", "Active"],
    ["Jordan K.", "JK-1844", "12 orders", "$3,240", "Active"],
    ["Sam T.", "ST-8402", "9 orders", "$2,118", "Review"],
    ["Alex N.", "AN-5510", "7 orders", "$1,904", "Active"],
  ];

  return (
    <>
      <FixtureHeader
        eyebrow="Customer records"
        title="Customers"
        description="Purchase history and account context without exposing more than the shift needs."
        action="Add customer"
      />
      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Active profiles"
          value="284"
          detail="11 added this month"
        />
        <MetricCard
          label="Repeat buyers"
          value="68%"
          detail="+4.2% over 30 days"
        />
        <MetricCard
          label="Balances due"
          value="$7,420"
          detail="Across 14 customers"
          direction="down"
        />
      </section>
      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#121212]">
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
              aria-hidden="true"
            />
            <span className="sr-only">Search customers</span>
            <input
              readOnly
              placeholder="Search name, alias, or account ID"
              className="h-10 w-full rounded-md border border-white/10 bg-black/30 pl-10 pr-3 text-sm placeholder:text-zinc-600"
            />
          </label>
          <StatusPill tone="info">Protected view</StatusPill>
        </div>
        <div className="hidden grid-cols-[1.3fr_0.75fr_0.65fr_0.65fr_40px] gap-3 border-b border-white/[0.06] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600 md:grid">
          <span>Customer</span>
          <span>Account</span>
          <span>History</span>
          <span>Lifetime value</span>
          <span />
        </div>
        <div className="divide-y divide-white/[0.06]">
          {customers.map(([name, account, history, value, status]) => (
            <div
              key={account}
              className="grid gap-3 px-5 py-4 md:grid-cols-[1.3fr_0.75fr_0.65fr_0.65fr_40px] md:items-center"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-[#ccff00]/10 font-mono text-xs font-bold text-[#ccff00]">
                  {name.slice(0, 1)}
                </div>
                <div>
                  <p className="text-sm font-medium">{name}</p>
                  <p className="mt-1 text-xs text-zinc-600 md:hidden">
                    {history}
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs text-zinc-500">{account}</span>
              <span className="hidden text-sm text-zinc-400 md:block">
                {history}
              </span>
              <div>
                <p className="font-mono text-sm">{value}</p>
                <div className="mt-2 md:hidden">
                  <StatusPill
                    tone={status === "Review" ? "warning" : "success"}
                  >
                    {status}
                  </StatusPill>
                </div>
              </div>
              <button
                type="button"
                aria-label={`Open ${name}`}
                className="hidden size-9 items-center justify-center rounded-md border border-white/10 text-zinc-500 md:flex"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function FixtureHeader({
  eyebrow,
  title,
  description,
  action,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  compact?: boolean;
}) {
  return (
    <header
      className={`flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between ${compact ? "pb-1" : ""}`}
    >
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-[#ccff00]" />
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {eyebrow}
          </p>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          {description}
        </p>
      </div>
      <button
        type="button"
        className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#ccff00] px-5 text-sm font-semibold text-black"
      >
        {action === "Add stock" ? <PackagePlus className="size-4" /> : null}
        {action === "Add customer" ? <UserPlus className="size-4" /> : null}
        {action}
      </button>
    </header>
  );
}

function FixtureSidebar({ screen }: { screen: OperatorFixtureScreen }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-white/10 bg-[#0d0d0d] lg:flex">
      <div className="border-b border-white/10 px-6 py-5">
        <Image
          src="/brand/drx-wordmark.svg"
          alt="Deelrx CRM"
          width={150}
          height={44}
          priority
          className="h-9 w-auto"
        />
        <div className="mt-3">
          <StatusPill tone="warning">Beta</StatusPill>
        </div>
      </div>
      <nav
        className="flex-1 space-y-1 p-3"
        aria-label="Visual fixture navigation"
      >
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = item.screen === screen;
          return (
            <div
              key={item.screen}
              className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm ${
                active
                  ? "bg-[#ccff00] font-semibold text-black"
                  : "text-zinc-400"
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </div>
          );
        })}
        <div className="my-3 border-t border-white/[0.07]" />
        {[
          [BarChart3, "Reports"],
          [CircleDollarSign, "Payments"],
          [ShieldCheck, "Team & access"],
        ].map(([Icon, label]) => (
          <div
            key={String(label)}
            className="flex h-11 items-center gap-3 px-3 text-sm text-zinc-500"
          >
            <Icon className="size-4" aria-hidden="true" />
            {String(label)}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="rounded-lg border border-white/[0.07] bg-black/30 p-3">
          <p className="text-xs font-medium">Downtown operation</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            Owner access · Register 01
          </p>
        </div>
      </div>
    </aside>
  );
}

function FixtureMobileChrome({ screen }: { screen: OperatorFixtureScreen }) {
  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/10 bg-[#0a0a0a]/95 px-4 backdrop-blur lg:hidden">
        <Image
          src="/brand/drx-wordmark.svg"
          alt="Deelrx CRM"
          width={110}
          height={32}
          priority
          className="h-7 w-auto"
        />
        <button
          type="button"
          aria-label="Open menu"
          className="flex size-10 items-center justify-center rounded-md border border-white/10"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-4 border-t border-white/10 bg-[#0d0d0d] px-2 lg:hidden">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = item.screen === screen;
          return (
            <div
              key={item.screen}
              className={`flex flex-col items-center justify-center gap-1 font-mono text-[9px] uppercase tracking-wider ${
                active ? "text-[#ccff00]" : "text-zinc-600"
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </div>
          );
        })}
      </nav>
    </>
  );
}

export function OperatorScreenFixture({
  screen,
}: {
  screen: OperatorFixtureScreen;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5]">
      <FixtureSidebar screen={screen} />
      <FixtureMobileChrome screen={screen} />
      <main className="pb-24 lg:ml-64 lg:pb-12">
        <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
          {screen === "dashboard" ? <DashboardFixture /> : null}
          {screen === "pos-sale" ? <PosFixture /> : null}
          {screen === "inventory" ? <InventoryFixture /> : null}
          {screen === "customers" ? <CustomersFixture /> : null}
        </div>
      </main>
      <div className="pointer-events-none fixed inset-0 opacity-[0.018] [background-image:radial-gradient(circle_at_center,white_0.7px,transparent_0.8px)] [background-size:5px_5px]" />
    </div>
  );
}
