import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleDollarSign,
  LockKeyhole,
  PackageCheck,
  ReceiptText,
  Search,
  ShieldCheck,
  ShoppingCart,
  UsersRound,
  Zap,
} from "lucide-react";

import { appLoginUrl, appWaitlistUrl } from "@/lib/app-links";
import { marketingFeatureSections } from "@/lib/feature-canon";

const canonicalPoints = (id: (typeof marketingFeatureSections)[number]["id"], limit = 3) =>
  marketingFeatureSections.find((section) => section.id === id)?.bullets.slice(0, limit).map((bullet) => bullet.text) ?? [];

const capabilities = [
  {
    icon: Zap,
    kicker: "Quick POS",
    title: "Fast money moves.",
    body: "Search or scan. Add the item. Take cash or card. Finish the sale without a ten-screen detour.",
    points: canonicalPoints("quick-pos"),
  },
  {
    icon: ReceiptText,
    kicker: "Transactions",
    title: "Every dollar accounted for.",
    body: "Keep customer history, controlled discounts, refunds, receipts, and the audit context that explains every adjustment.",
    points: canonicalPoints("fast-pos"),
  },
  {
    icon: PackageCheck,
    kicker: "Inventory",
    title: "Know what is on deck.",
    body: "Live stock movement, barcode-ready records, low-stock warnings, and activity history replace guesswork with a clean count.",
    points: canonicalPoints("inventory"),
  },
  {
    icon: UsersRound,
    kicker: "Roles",
    title: "Access stays tight.",
    body: "Operators get the tools they need. Admin controls stay protected. Sensitive actions keep an attributable record.",
    points: canonicalPoints("team-control"),
  },
  {
    icon: BarChart3,
    kicker: "Reporting",
    title: "Numbers that drive the shift.",
    body: "See revenue, order volume, top movers, team performance, and stock risk without presentation-theater charts.",
    points: canonicalPoints("reports"),
  },
  {
    icon: ShieldCheck,
    kicker: "Security",
    title: "Your operation stays yours.",
    body: "Authentication, business-scoped data, controlled privileges, and audit logging are built into the operating model.",
    points: ["Business-scoped access", "Encrypted connections", "Audit logging"],
  },
];

function BrandLockup() {
  return (
    <span className="inline-flex items-center gap-3">
      <Image src="/brand/drx-wordmark.svg" alt="DRX" width={92} height={64} className="h-9 w-auto" priority />
      <span className="hidden border-l border-white/15 pl-3 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70 sm:block">
        Deelrx CRM
      </span>
    </span>
  );
}

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-extrabold uppercase tracking-[0.08em] text-black transition duration-200 hover:bg-[#d7ff33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-background"
    >
      {children}
    </Link>
  );
}

function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/20 bg-white/[0.03] px-5 py-3 text-sm font-bold text-white transition duration-200 hover:border-white/40 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {children}
    </Link>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-[1280px] items-center justify-between gap-5 px-5 md:px-8">
        <Link href="/" aria-label="Deelrx CRM home"><BrandLockup /></Link>
        <nav aria-label="Primary navigation" className="hidden items-center gap-7 text-sm text-white/65 md:flex">
          <Link href="#product" className="hover:text-white">Product</Link>
          <Link href="#control" className="hover:text-white">Control</Link>
          <Link href="#security" className="hover:text-white">Security</Link>
          <Link href={appLoginUrl} className="hover:text-white">Operator login</Link>
        </nav>
        <PrimaryLink href={appWaitlistUrl}>Join the Beta</PrimaryLink>
      </div>
    </header>
  );
}

function QuickSaleProof() {
  return (
    <div className="overflow-hidden rounded-[14px] border border-white/15 bg-[#121212] shadow-[0_28px_70px_rgba(0,0,0,0.45)]" aria-label="Deterministic Quick Sale product preview">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded bg-accent px-2 py-1 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-black">Live demo</span>
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-white/55">Quick Sale</span>
        </div>
        <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-400" /> Register ready
        </span>
      </div>

      <div className="grid min-h-[420px] lg:grid-cols-[1fr_220px]">
        <div className="border-white/10 p-4 lg:border-r">
          <label className="flex min-h-11 items-center gap-3 rounded-md border border-white/15 bg-[#0A0A0A] px-3 text-white/50">
            <Search className="size-4" aria-hidden />
            <span className="text-sm">Search product, SKU, or barcode</span>
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              ["HOOD-BLK-M", "Core Hoodie", "$68.00", "14 in stock"],
              ["TEE-WHT-L", "Heavyweight Tee", "$34.00", "22 in stock"],
              ["CAP-GRN", "Operator Cap", "$28.00", "8 in stock"],
              ["BAG-BLK", "Utility Bag", "$46.00", "Low: 3 left"],
            ].map(([sku, name, price, stock], index) => (
              <button key={sku} className="min-h-32 rounded-lg border border-white/10 bg-[#1A1A1A] p-3 text-left transition hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/45">{sku}</span>
                <span className="mt-6 block text-sm font-bold text-white">{name}</span>
                <span className="mt-2 flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-accent">{price}</span>
                  <span className={index === 3 ? "text-[10px] text-amber-400" : "text-[10px] text-white/45"}>{stock}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col bg-[#0D0D0D]">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <span className="text-sm font-bold text-white">Current order</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">2 items</span>
          </div>
          <div className="flex-1 space-y-3 p-4">
            <div className="rounded-md border border-white/10 bg-[#171717] p-3">
              <p className="text-sm font-semibold text-white">Core Hoodie</p>
              <p className="mt-1 font-mono text-xs text-white/45">1 × $68.00</p>
            </div>
            <div className="rounded-md border border-white/10 bg-[#171717] p-3">
              <p className="text-sm font-semibold text-white">Operator Cap</p>
              <p className="mt-1 font-mono text-xs text-white/45">1 × $28.00</p>
            </div>
          </div>
          <div className="border-t border-white/10 p-4">
            <div className="flex items-end justify-between">
              <span className="text-xs uppercase tracking-[0.12em] text-white/50">Total</span>
              <span className="font-mono text-2xl font-bold text-white">$96.00</span>
            </div>
            <button className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-black uppercase tracking-[0.1em] text-black">
              Charge <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
      <p className="border-t border-white/10 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">Illustrative product data · real DRX workflow</p>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-white/10">
      <div className="operator-grid absolute inset-0 opacity-50" aria-hidden />
      <div className="relative mx-auto grid max-w-[1280px] gap-12 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:py-28">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent">Built for the operator</p>
          <h1 className="mt-5 max-w-[740px] text-[clamp(3.2rem,7vw,6.7rem)] font-extrabold leading-[0.91] tracking-[-0.06em] text-white">
            For the ones who run it,<br /><span className="text-accent">not the ones who talk about it.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-white/65">
            Fast checkout. Real inventory control. Clean numbers. Tight permissions. Deelrx CRM keeps the operation moving without making software another job.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryLink href={appWaitlistUrl}>Join the Beta <ArrowRight className="size-4" /></PrimaryLink>
            <SecondaryLink href="#product">See Deelrx in Action</SecondaryLink>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
            <span className="inline-flex items-center gap-2"><Check className="size-3.5 text-accent" /> Counter fast</span>
            <span className="inline-flex items-center gap-2"><Check className="size-3.5 text-accent" /> Audit ready</span>
            <span className="inline-flex items-center gap-2"><Check className="size-3.5 text-accent" /> Role controlled</span>
          </div>
        </div>
        <QuickSaleProof />
      </div>
    </section>
  );
}

function OperatorStrip() {
  const items = [
    [ShoppingCart, "Move the line", "A checkout flow built around speed."],
    [PackageCheck, "Trust the count", "Inventory changes with every sale."],
    [CircleDollarSign, "See the money", "Revenue and adjustments stay legible."],
    [LockKeyhole, "Control access", "The right tools for the right role."],
  ] as const;
  return (
    <section aria-label="Operator benefits" className="border-b border-white/10 bg-[#0D0D0D]">
      <div className="mx-auto grid max-w-[1280px] md:grid-cols-2 lg:grid-cols-4">
        {items.map(([Icon, title, body]) => (
          <div key={title} className="border-white/10 px-5 py-8 md:px-8 lg:border-r last:border-r-0">
            <Icon className="size-5 text-accent" aria-hidden />
            <h2 className="mt-4 text-base font-bold text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/50">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Capabilities() {
  return (
    <section id="product" className="mx-auto max-w-[1280px] px-5 py-20 md:px-8 md:py-28">
      <div className="grid gap-10 border-b border-white/10 pb-12 lg:grid-cols-2 lg:items-end">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent">What Deelrx actually does</p>
          <h2 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-[-0.04em] text-white md:text-6xl">One system for the work that keeps the doors moving.</h2>
        </div>
        <p className="max-w-xl text-base leading-7 text-white/55 lg:justify-self-end">Desktop stays information-dense. Mobile stays task-focused. The terminology, priorities, states, and controls stay familiar wherever the shift takes you.</p>
      </div>

      <div id="control" className="grid md:grid-cols-2 lg:grid-cols-3">
        {capabilities.map(({ icon: Icon, kicker, title, body, points }, index) => (
          <article key={title} id={kicker === "Security" ? "security" : undefined} className="border-b border-white/10 px-0 py-10 md:px-7 lg:min-h-[360px] lg:border-r lg:nth-[3n]:border-r-0">
            <div className="flex items-center justify-between">
              <span className="flex size-11 items-center justify-center rounded-md border border-accent/25 bg-accent/10 text-accent"><Icon className="size-5" aria-hidden /></span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/30">0{index + 1}</span>
            </div>
            <p className="mt-8 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">{kicker}</p>
            <h3 className="mt-3 text-2xl font-bold tracking-[-0.02em] text-white">{title}</h3>
            <p className="mt-4 text-sm leading-6 text-white/55">{body}</p>
            <ul className="mt-6 space-y-2">
              {points.map((point) => <li key={point} className="flex items-center gap-2 text-xs text-white/65"><Check className="size-3.5 text-accent" aria-hidden />{point}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function Manifesto() {
  return (
    <section className="border-y border-white/10 bg-[#121212]">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[0.7fr_1.3fr]">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent">Why Deelrx</p>
        <div>
          <h2 className="max-w-4xl text-4xl font-extrabold leading-tight tracking-[-0.04em] text-white md:text-6xl">You are building something, scaling something, and protecting something.</h2>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-white/60">You need speed, control, clean numbers, and inventory discipline. Deelrx is built to respect the pace of an owner-operator—clear enough for the counter and disciplined enough for the books.</p>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section id="beta-access" className="mx-auto max-w-[1280px] px-5 py-20 md:px-8 md:py-28">
      <div className="relative overflow-hidden rounded-[14px] border border-accent/25 bg-[#151515] px-6 py-14 md:px-12 md:py-20">
        <div className="relative z-10 max-w-3xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent">Deelrx CRM beta</p>
          <h2 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] text-white md:text-6xl">Run the operation tighter.</h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/60">Join the beta, put Deelrx into a real workflow, and help shape the operator console around the work that matters.</p>
          <div className="mt-8 flex flex-wrap gap-3"><PrimaryLink href={appWaitlistUrl}>Join the Beta <ArrowRight className="size-4" /></PrimaryLink><SecondaryLink href={appLoginUrl}>Operator login</SecondaryLink></div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-8">
        <div><BrandLockup /><p className="mt-3 max-w-md text-xs leading-5 text-white/40">Operator-first CRM, POS, inventory, and reporting. Currently in beta.</p></div>
        <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs text-white/50"><Link href="/legal/privacy" className="hover:text-white">Privacy</Link><Link href="/legal/terms" className="hover:text-white">Terms</Link><Link href="/legal/regulatory-disclaimer" className="hover:text-white">Regulatory disclaimer</Link></div>
      </div>
    </footer>
  );
}

export function LandingPageSections() {
  return <><Header /><Hero /><OperatorStrip /><Capabilities /><Manifesto /><FinalCta /><Footer /></>;
}
