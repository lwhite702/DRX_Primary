"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Menu,
  X,
  CheckCircle2,
  XCircle,
  BarChart,
  Users,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Rotating Status Chip Component - Kept for "Neon Velocity" vibe
function StatusChip() {
  const statuses = [
    "PRIVACY CONTROLS: ON",
    "AUDIT LOGGING: ON",
    "OFFLINE MODE: AVAILABLE",
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % statuses.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="technical-label flex items-center gap-2 border border-border/50 px-3 py-1.5 rounded-full bg-background/50 backdrop-blur-md transition-all duration-500 min-w-[200px] justify-center">
      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
      <span className="fade-in-out key={index}">{statuses[index]}</span>
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden font-sans">
      {/* Noise Overlay */}
      <div className="noise-overlay pointer-events-none fixed inset-0 z-0 opacity-[0.03]"></div>

      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="flex items-center gap-2">
          <div className="relative w-[60px] h-8">
            <Image
              src="/brand/drx-mark-primary.png"
              alt="DeelRx"
              fill
              className="object-contain"
            />
          </div>
          <span className="font-bold text-xl tracking-tight">DeelRx</span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {["WHY", "FEATURES", "WHO", "PROOF"].map((item) => (
            <button
              key={item}
              onClick={() => scrollToSection(item.toLowerCase())}
              className="technical-label hover:text-accent transition-colors text-xs tracking-widest"
            >
              {item}
            </button>
          ))}
          <Link
            href="/login"
            className="technical-label hover:text-accent transition-colors text-xs tracking-widest"
          >
            LOGIN
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            <StatusChip />
          </div>
          <Link href="/login">
            <Button
              size="sm"
              className="bg-foreground text-background hover:bg-foreground/90 font-semibold rounded-full px-6"
            >
              START
            </Button>
          </Link>
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-sm pt-24 px-6 md:hidden">
          <nav className="flex flex-col gap-6 text-center">
            {["WHY", "FEATURES", "WHO", "PROOF"].map((item) => (
              <button
                key={item}
                onClick={() => scrollToSection(item.toLowerCase())}
                className="text-2xl font-bold tracking-tight hover:text-accent"
              >
                {item}
              </button>
            ))}
            <Link
              href="/login"
              className="text-2xl font-bold tracking-tight hover:text-accent"
            >
              LOGIN
            </Link>
          </nav>
        </div>
      )}

      <main className="flex-1 relative z-10">
        {/* HERO SECTION */}
        <section className="py-24 md:py-32 px-6 flex flex-col items-center text-center max-w-5xl mx-auto space-y-10">
          <div className="relative w-24 h-12 mb-4">
            <Image
              src="/brand/drx-mark-primary.png"
              alt="DRX"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1]">
            Run real transactions.
            <br />
            <span className="text-accent">Without the mess.</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl leading-relaxed">
            DeelRx is a privacy-first CRM and POS built for cash-heavy,
            inventory-sensitive businesses that don’t operate on neat timelines.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-8">
            <Button
              size="lg"
              className="text-lg px-8 py-6 rounded-full bg-foreground text-background hover:bg-foreground/90 w-full sm:w-auto"
            >
              Get Set Up Quietly
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6 rounded-full w-full sm:w-auto"
              onClick={() => scrollToSection("proof")}
            >
              See How It Works
            </Button>
          </div>
        </section>

        {/* TRUST SIGNAL STRIP */}
        <section className="py-8 border-y border-border/40 bg-muted/20">
          <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-center gap-x-12 gap-y-4 text-sm font-mono tracking-widest uppercase text-muted-foreground">
            <span>No unnecessary data collection</span>
            <span>Built for fast-moving inventory</span>
            <span>Credit tracking included</span>
            <span>Designed for discretion</span>
          </div>
        </section>

        {/* WHY DEELRX */}
        <section id="why" className="py-24 px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <span className="text-accent text-sm font-bold tracking-widest uppercase">
              WHY DEELRX
            </span>
            <h2 className="text-4xl md:text-6xl font-bold leading-tight">
              Most software assumes perfect paperwork.
              <br />
              <span className="text-muted-foreground">
                Real businesses don’t.
              </span>
            </h2>
            <div className="space-y-6 text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              <p>
                DeelRx was built for operators who manage inventory that moves
                fast, customers who don’t always pay immediately, and workflows
                that don’t fit neatly into enterprise accounting tools.
              </p>
              <div className="pt-4 font-bold text-foreground grid gap-2">
                <p>No bloat.</p>
                <p>No moralizing.</p>
                <p>No noise.</p>
              </div>
              <p className="pt-4 text-accent">
                Just tools that reflect reality.
              </p>
            </div>
          </div>
        </section>

        {/* WHAT IT HANDLES */}
        <section id="features" className="py-24 px-6 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-accent text-sm font-bold tracking-widest uppercase">
                WHAT IT HANDLES
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: "Inventory that actually moves",
                  desc: "Track stock changes in real time without guessing or reconciliation nightmares.",
                  icon: <BarChart className="w-8 h-8 text-accent" />,
                },
                {
                  title: "Credit that doesn’t disappear",
                  desc: "Record pay-later balances clearly and privately so nothing slips through the cracks.",
                  icon: <Users className="w-8 h-8 text-accent" />,
                },
                {
                  title: "Cash without chaos",
                  desc: "Log transactions without overcomplicating operations or drawing attention.",
                  icon: <Zap className="w-8 h-8 text-accent" />,
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="bg-background border border-border/50 p-8 rounded-2xl md:min-h-[200px] flex flex-col gap-4 hover:border-accent/50 transition-colors"
                >
                  <div className="mb-2">{feature.icon}</div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHO IT'S FOR */}
        <section id="who" className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-accent text-sm font-bold tracking-widest uppercase">
                WHO IT'S FOR
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              {/* BUILT FOR */}
              <div className="space-y-8 bg-muted/20 p-8 rounded-2xl border border-border/50">
                <h3 className="text-3xl font-bold">Built for</h3>
                <ul className="space-y-4">
                  {[
                    "Independent retail operators",
                    "Cash-heavy businesses",
                    "Sellers who extend informal credit",
                    "Teams managing fast-moving inventory",
                    "Operators who value discretion",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-lg">
                      <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* NOT BUILT FOR */}
              <div className="space-y-8 bg-red-500/5 p-8 rounded-2xl border border-red-500/20">
                <h3 className="text-3xl font-bold">Not built for</h3>
                <ul className="space-y-4">
                  {[
                    "Enterprise chains",
                    "Net-30-only businesses",
                    "Compliance-heavy accounting departments",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-lg text-muted-foreground"
                    >
                      <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-8 text-center text-sm font-mono uppercase tracking-widest text-muted-foreground">
                  This product chooses a side.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* VISUAL PROOF */}
        <section id="proof" className="py-24 px-6 bg-muted/30">
          <div className="max-w-6xl mx-auto space-y-16">
            <div className="text-center">
              <span className="text-accent text-sm font-bold tracking-widest uppercase">
                VISUAL PROOF
              </span>
              <h2 className="text-3xl md:text-5xl font-bold mt-4">
                Dark UI. Neon accents. <br />
                Operational clarity.
              </h2>
            </div>

            {/* Simulated UI Screens */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Inventory Screen Simulation */}
              <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden aspect-[4/3] relative group">
                <div className="absolute inset-0 bg-background flex flex-col group-hover:scale-[1.01] transition-transform duration-500">
                  {/* Mock Header */}
                  <div className="h-12 border-b border-border flex items-center px-4 justify-between bg-muted/10">
                    <div className="text-xs font-bold font-mono">
                      INVENTORY // LIVE
                    </div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  {/* Mock Table */}
                  <div className="p-4 space-y-3 font-mono text-xs">
                    <div className="grid grid-cols-4 text-muted-foreground mb-2">
                      <span>ITEM</span>
                      <span>STOCK</span>
                      <span>VALUE</span>
                      <span>STATUS</span>
                    </div>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="grid grid-cols-4 items-center py-2 border-b border-border/30"
                      >
                        <div className="h-2 w-16 bg-muted rounded"></div>
                        <div className="h-2 w-8 bg-muted rounded"></div>
                        <div className="h-2 w-12 bg-muted rounded"></div>
                        <div className="h-2 w-10 bg-accent/50 rounded"></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur border border-border px-3 py-1 text-xs font-bold rounded">
                  INVENTORY TABLES
                </div>
              </div>

              {/* Credit Screen Simulation */}
              <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden aspect-[4/3] relative group">
                <div className="absolute inset-0 bg-background flex flex-col group-hover:scale-[1.01] transition-transform duration-500">
                  {/* Mock Header */}
                  <div className="h-12 border-b border-border flex items-center px-4 justify-between bg-muted/10">
                    <div className="text-xs font-bold font-mono">
                      CREDIT // OUTSTANDING
                    </div>
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    </div>
                  </div>
                  {/* Mock List */}
                  <div className="p-4 space-y-4 font-mono text-xs">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 border border-border/50 rounded bg-muted/5"
                      >
                        <div className="flex gap-3 items-center">
                          <div className="w-8 h-8 rounded-full bg-muted"></div>
                          <div className="space-y-1">
                            <div className="h-2 w-20 bg-muted rounded"></div>
                            <div className="h-1.5 w-12 bg-muted/50 rounded"></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="h-3 w-16 bg-red-500/20 rounded mb-1"></div>
                          <div className="h-1.5 w-10 bg-muted/50 rounded ml-auto"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur border border-border px-3 py-1 text-xs font-bold rounded">
                  CREDIT BALANCES
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-32 px-6 text-center space-y-8">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter max-w-4xl mx-auto">
            Software that understands how business actually works.
          </h2>
          <Link href="/login">
            <Button
              size="lg"
              className="text-lg px-12 py-8 rounded-full bg-foreground text-background hover:bg-foreground/90 mt-8"
            >
              Start With DeelRx
            </Button>
          </Link>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-border/40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="relative w-8 h-5">
                <Image
                  src="/brand/drx-mark-primary.png"
                  alt="DRX"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="font-bold text-lg">DeelRx</span>
            </div>
            <div className="flex gap-4 text-xs font-mono tracking-widest text-muted-foreground">
              <span>OPERATIONAL STATUS: ACTIVE</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              DeelRx is a business operations platform.
            </p>
          </div>
          <div className="flex gap-8 text-sm font-bold tracking-widest">
            <Link href="#" className="hover:text-accent">
              PRIVACY POLICY
            </Link>
            <Link href="#" className="hover:text-accent">
              TERMS
            </Link>
            <Link href="#" className="hover:text-accent">
              CONTACT
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
