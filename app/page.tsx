"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinWaitlist } from "@/app/actions/beta";
import { toast } from "sonner";
import {
  Loader2,
  ArrowRight,
  ShieldCheck,
  Zap,
  BarChart,
  Users,
  Lock,
  Database,
  WifiOff,
  History,
  Tag,
  CheckCircle2,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Rotating Status Chip Component
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
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("email", email);

    // Simulate waitlist join for now or use actual action
    // const result = await joinWaitlist(formData);
    // For V1 Speed:
    setTimeout(() => {
      setLoading(false);
      setJoined(true);
      toast.success("Welcome to the waitlist!");
    }, 800);
  };

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
          <div className="relative w-8 h-8">
            <Image src="/icon.svg" alt="DRX" fill className="object-contain" />
          </div>
          <span className="font-bold text-xl tracking-tight">DRX</span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {["PRODUCT", "PRIVACY", "POS", "INVENTORY", "PRICING", "FAQ"].map(
            (item) => (
              <button
                key={item}
                onClick={() => scrollToSection(item.toLowerCase())}
                className="technical-label hover:text-accent transition-colors text-xs tracking-widest"
              >
                {item}
              </button>
            ),
          )}
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
          <Link href="#start">
            <Button
              size="sm"
              className="bg-foreground text-background hover:bg-foreground/90 font-semibold rounded-full px-6"
            >
              START FREE
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
            {["PRODUCT", "PRIVACY", "POS", "INVENTORY", "PRICING", "FAQ"].map(
              (item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item.toLowerCase())}
                  className="text-2xl font-bold tracking-tight hover:text-accent"
                >
                  {item}
                </button>
              ),
            )}
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
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1]">
            RUN YOUR SHOP.
            <br />
            <span className="text-accent">KEEP YOUR NUMBERS STRAIGHT.</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl leading-relaxed">
            DRX is a fast, privacy-respecting POS and inventory system for
            independent operators.
            <br className="hidden md:block" />
            Sell quicker. Track stock accurately. Only collect what you actually
            need.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {[
              "MOBILE POS",
              "OWNER-CONTROLLED PRIVACY",
              "REAL-TIME INVENTORY",
              "ROLE-BASED ACCESS",
            ].map((chip) => (
              <span
                key={chip}
                className="px-3 py-1 rounded-full border border-border/50 bg-secondary/30 text-xs font-mono text-secondary-foreground"
              >
                {chip}
              </span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-4">
            <Button
              size="lg"
              className="text-lg px-8 py-6 rounded-full bg-foreground text-background hover:bg-foreground/90 w-full sm:w-auto"
            >
              START FREE
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6 rounded-full w-full sm:w-auto"
              onClick={() => scrollToSection("product")}
            >
              SEE HOW IT WORKS
            </Button>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent my-8" />

          <div className="flex justify-center gap-8 text-xs md:text-sm font-mono text-muted-foreground tracking-widest uppercase">
            <span>FAST CHECKOUT</span>
            <span>ACCURATE COUNTS</span>
            <span>NO EXTRA DATA</span>
          </div>
        </section>

        {/* THE PROBLEM */}
        <section className="py-20 px-6 bg-muted/30">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <span className="text-accent text-sm font-bold tracking-widest uppercase">
              THE REAL PROBLEM
            </span>
            <h2 className="text-3xl md:text-5xl font-bold">
              MESSY SYSTEMS CAUSE REAL PROBLEMS.
            </h2>
            <div className="space-y-2 text-lg text-muted-foreground">
              <p>Slow checkout costs money.</p>
              <p>Bad inventory causes arguments.</p>
              <p>Oversharing customer data causes headaches.</p>
              <p className="pt-4 font-semibold text-foreground">
                Most tools make all three worse.
              </p>
            </div>
          </div>
        </section>

        {/* WHAT DRX IS */}
        <section id="product" className="py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <span className="text-accent text-sm font-bold tracking-widest uppercase">
                  WHAT THIS IS
                </span>
                <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                  BUILT FOR PEOPLE WHO RUN SHOPS, NOT DESKS.
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  DRX helps independent businesses sell faster, track inventory
                  correctly, and stay organized without collecting more
                  information than necessary.
                </p>
                <ul className="space-y-4">
                  {[
                    "Mobile-first checkout",
                    "Inventory with real units and conversions",
                    "Optional customer information",
                    "Owner-controlled settings",
                    "Clear records when you need them",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-accent" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                {/* Placeholder for App Screenshot */}
                <div className="aspect-[9/16] bg-muted/50 rounded-lg flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-x-4 top-4 bottom-20 bg-background rounded border border-border shadow-sm p-4 space-y-4">
                    <div className="h-2 w-1/3 bg-muted rounded"></div>
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center"
                        >
                          <div className="h-8 w-8 bg-muted rounded-full"></div>
                          <div className="h-2 w-24 bg-muted rounded"></div>
                          <div className="h-6 w-12 bg-muted rounded"></div>
                        </div>
                      ))}
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 h-12 bg-accent rounded flex items-center justify-center text-background font-bold">
                      CHECKOUT
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CORE SYSTEMS GRID */}
        <section className="py-24 px-6 bg-background space-y-32">
          <div className="text-center mb-16">
            <span className="text-accent text-sm font-bold tracking-widest uppercase">
              CORE SYSTEMS
            </span>
          </div>

          {[
            {
              id: "privacy",
              label: "PRIVACY CONTROLS",
              title: "YOU DECIDE WHAT GETS STORED.",
              copy: [
                "Some shops need names and numbers.",
                "Some don't.",
                "DRX lets owners choose what information is collected, what staff can see, and what can be exported.",
              ],
              proof: "PRESETS ENFORCED ACROSS THE SYSTEM",
              icon: <Lock className="w-8 h-8 text-accent" />,
            },
            {
              id: "pos",
              label: "POINT OF SALE",
              title: "SELL FAST. MOVE ON.",
              copy: [
                "Search products by name or nickname.",
                "Tap quantities.",
                "Finish the sale without slowing the line.",
              ],
              proof: "DESIGNED FOR MOBILE USE",
              icon: <Zap className="w-8 h-8 text-accent" />,
            },
            {
              id: "inventory",
              label: "INVENTORY",
              title: "KNOW WHAT YOU ACTUALLY HAVE.",
              copy: [
                "Track inventory using real units.",
                "Every intake and adjustment requires a reason.",
                "Everything stays recorded.",
              ],
              proof: "AUDIT HISTORY INCLUDED",
              icon: <BarChart className="w-8 h-8 text-accent" />,
            },
            {
              id: "aliases",
              label: "ALIASES / NICKNAMES",
              title: "CALL IT WHAT YOU CALL IT.",
              copy: [
                "Nicknames map to real products and quantities.",
                "Staff works faster. Fewer mistakes happen.",
              ],
              proof: "ALIASES LINKED TO INVENTORY",
              icon: <Tag className="w-8 h-8 text-accent" />,
            },
            {
              id: "credit",
              label: "CREDIT",
              title: "KEEP TRACK OF WHO OWES WHAT.",
              copy: [
                "Set limits.",
                "Record payments.",
                "See what's outstanding without guessing.",
              ],
              proof: "OWNER-CONTROLLED POLICIES",
              icon: <Users className="w-8 h-8 text-accent" />,
            },
            {
              id: "offline",
              label: "OFFLINE MODE",
              title: "WORKS EVEN WHEN SIGNALS DON'T.",
              copy: [
                "Continue selling during outages.",
                "Changes sync safely when connection returns.",
              ],
              proof: "NO SILENT FAILURES",
              icon: <WifiOff className="w-8 h-8 text-accent" />,
            },
          ].map((feature, idx) => (
            <div
              key={feature.id}
              id={feature.id}
              className={cn(
                "max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center",
                idx % 2 === 1 && "md:flex-row-reverse",
              )}
            >
              <div className={cn(idx % 2 === 1 && "md:order-2")}>
                <div className="bg-muted/30 p-8 rounded-2xl aspect-square flex items-center justify-center border border-border/50">
                  {feature.icon}
                </div>
              </div>
              <div className="space-y-6">
                <span className="text-accent text-sm font-bold tracking-widest uppercase">
                  {feature.label}
                </span>
                <h3 className="text-3xl md:text-4xl font-bold">
                  {feature.title}
                </h3>
                <div className="space-y-2 text-lg text-muted-foreground">
                  {feature.copy.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
                    {feature.proof}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* PRIVACY EXPLAINED */}
        <section className="py-24 px-6 bg-muted/30">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-6">
              <span className="text-accent text-sm font-bold tracking-widest uppercase">
                PRIVACY CONTROLS
              </span>
              <h2 className="text-3xl md:text-5xl font-bold">
                YOU PICK THE MODE. THE SYSTEM OBEYS.
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Every business runs differently. DRX gives owners control over
                how much information is collected, shown, and shared.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                {
                  title: "OPEN",
                  desc: "Full customer details available to authorized roles.",
                },
                {
                  title: "BALANCED",
                  desc: "Standard operations with sensible limits and controls.",
                },
                {
                  title: "PRIVATE",
                  desc: "Reduced customer information by default. Tighter export restrictions.",
                },
                {
                  title: "MAX SECURE",
                  desc: "Minimal customer information. Strict access and export controls.",
                },
              ].map((mode) => (
                <div
                  key={mode.title}
                  className="bg-background border border-border/50 p-6 rounded-xl flex flex-col justify-between hover:border-accent/50 transition-colors"
                >
                  <h4 className="font-bold text-lg mb-2">{mode.title}</h4>
                  <p className="text-sm text-muted-foreground">{mode.desc}</p>
                </div>
              ))}
            </div>

            <div className="text-center">
              <p className="text-sm font-mono tracking-widest text-muted-foreground uppercase">
                Privacy rules apply everywhere: screens, reports, and exports.
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto space-y-16">
            <div className="text-center">
              <span className="text-accent text-sm font-bold tracking-widest uppercase">
                HOW IT WORKS
              </span>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              {[
                {
                  step: "1",
                  title: "SET UP YOUR SHOP",
                  desc: "Add your business details, choose units, and set privacy preferences.",
                },
                {
                  step: "2",
                  title: "LOAD PRODUCTS",
                  desc: "Add inventory and optional nicknames for faster sales.",
                },
                {
                  step: "3",
                  title: "SELL",
                  desc: "Use mobile checkout with quick quantities and clean receipts.",
                },
                {
                  step: "4",
                  title: "STAY ORGANIZED",
                  desc: "Inventory, payments, and adjustments stay recorded automatically.",
                },
              ].map((item) => (
                <div key={item.step} className="space-y-4 relative">
                  <div className="text-6xl font-bold text-muted/20 absolute -top-8 -left-4 z-0">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-lg relative z-10">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground relative z-10">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF */}
        <section className="py-20 px-6 bg-muted/30 border-y border-border/50">
          <div className="max-w-4xl mx-auto text-center space-y-12">
            <div>
              <span className="text-accent text-sm font-bold tracking-widest uppercase">
                USED BY INDEPENDENT OPERATORS
              </span>
              <h2 className="text-3xl font-bold mt-4">
                BUILT FOR REAL SHOPS WITH REAL VOLUME.
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8 text-left">
              {[
                {
                  quote:
                    "Checkout is fast and inventory finally matches what's on the shelf.",
                  role: "Retail Owner",
                },
                {
                  quote:
                    "Privacy settings let us run the shop without oversharing.",
                  role: "Manager",
                },
                {
                  quote: "Training new staff takes less than an hour.",
                  role: "Store Supervisor",
                },
              ].map((t, i) => (
                <div key={i} className="space-y-4">
                  <p className="text-lg italic text-muted-foreground">
                    "{t.quote}"
                  </p>
                  <p className="font-bold text-sm">— {t.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="py-24 px-6">
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <span className="text-accent text-sm font-bold tracking-widest uppercase">
                PRICING
              </span>
              <p className="text-xl">Simple plans based on how you operate.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Starter */}
              <div className="border border-border p-8 rounded-2xl space-y-6 flex flex-col">
                <h3 className="text-2xl font-bold">STARTER</h3>
                <ul className="space-y-3 flex-1">
                  <li className="flex gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-accent" /> Mobile POS
                  </li>
                  <li className="flex gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-accent" /> Inventory
                    tracking
                  </li>
                  <li className="flex gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-accent" /> Basic
                    privacy controls
                  </li>
                </ul>
                <Button className="w-full rounded-full" variant="outline">
                  START FREE
                </Button>
              </div>

              {/* Pro */}
              <div className="border border-accent p-8 rounded-2xl space-y-6 flex flex-col bg-accent/5 relative">
                <div className="absolute top-0 right-0 bg-accent text-background text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                  POPULAR
                </div>
                <h3 className="text-2xl font-bold">PRO</h3>
                <ul className="space-y-3 flex-1">
                  <li className="flex gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-accent" /> Everything
                    in Starter
                  </li>
                  <li className="flex gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-accent" /> Advanced
                    inventory
                  </li>
                  <li className="flex gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-accent" /> Credit
                    tracking
                  </li>
                  <li className="flex gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-accent" /> Role-based
                    access
                  </li>
                </ul>
                <Button className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">
                  UPGRADE
                </Button>
              </div>

              {/* Max Secure */}
              <div className="border border-border p-8 rounded-2xl space-y-6 flex flex-col">
                <h3 className="text-2xl font-bold">MAX SECURE</h3>
                <ul className="space-y-3 flex-1">
                  <li className="flex gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-accent" /> Full
                    privacy controls
                  </li>
                  <li className="flex gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-accent" /> Export
                    restrictions
                  </li>
                  <li className="flex gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-accent" /> Advanced
                    audit access
                  </li>
                </ul>
                <Button className="w-full rounded-full" variant="ghost">
                  CONTACT SALES
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-24 px-6 bg-muted/30">
          <div className="max-w-3xl mx-auto space-y-12">
            <h2 className="text-3xl font-bold text-center">FAQ</h2>
            <div className="space-y-8">
              {[
                {
                  q: "Does DRX work offline?",
                  a: "Yes. Sales and inventory changes sync when connection returns.",
                },
                {
                  q: "Do I have to collect customer information?",
                  a: "No. Owners decide what information is collected.",
                },
                {
                  q: "Is inventory tracked in real units?",
                  a: "Yes. DRX supports multiple units and conversions.",
                },
                {
                  q: "Is every adjustment recorded?",
                  a: "Yes. All changes require a reason and appear in audit history.",
                },
              ].map((item, i) => (
                <div key={i} className="space-y-2">
                  <h3 className="font-bold text-lg">{item.q}</h3>
                  <p className="text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-32 px-6 text-center space-y-8">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter">
            GET YOUR NUMBERS STRAIGHT.
          </h2>
          <p className="text-xl text-muted-foreground">
            Fast checkout. Accurate inventory. Owner-controlled privacy.
          </p>
          <Button
            size="lg"
            className="text-lg px-12 py-8 rounded-full bg-foreground text-background hover:bg-foreground/90"
          >
            START FREE
          </Button>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-border/40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex gap-4 text-xs font-mono tracking-widest text-muted-foreground">
              <span>TENANT ISOLATION: ENABLED</span>
              <span>AUDIT LOGGING: ENABLED</span>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              © {new Date().getFullYear()} Wrelik Brands LLC.
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
              SUPPORT
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
