"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinWaitlist } from "@/app/actions/beta";
import { toast } from "sonner";
import { Loader2, ArrowRight, ShieldCheck, Zap, BarChart, Users, Lock, Database } from "lucide-react";

export default function LandingPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("email", email);

    const result = await joinWaitlist(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      setJoined(true);
      toast.success("Welcome to the waitlist!");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      {/* Noise Overlay - Subtle physical imperfection */}
      <div className="noise-overlay"></div>

      {/* Ambient Glow Elements */}
      <div className="ambient-glow w-96 h-96 -left-48 -top-48"></div>
      <div className="ambient-glow w-64 h-64 -right-32 top-20"></div>

      <header className="px-6 py-4 flex justify-between items-center border-b border-border/40 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8">
            <Image
              src="/icon.svg"
              alt="DeelRx CRM"
              fill
              className="object-contain"
            />
          </div>
          <span className="font-bold text-xl tracking-tight">DRX</span>
          <span className="technical-label bg-accent/10 text-accent px-1.5 py-0.5 border border-accent/20">
            BETA
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/login" className="technical-label hover:text-accent transition-colors">
            LOGIN
          </Link>
          <Link href="/about" className="technical-label hover:text-accent transition-colors">
            ABOUT
          </Link>
          <Link href="/features" className="technical-label hover:text-accent transition-colors">
            FEATURES
          </Link>
        </nav>
        <Link href="/login">
          <Button variant="ghost" size="sm" className="technical-label">
            ENTER SYSTEM
          </Button>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center relative z-10">
        <div className="max-w-4xl space-y-12 w-full">
          {/* Hero Section */}
          <div className="space-y-8">
            {/* Meta Row - System Status */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="technical-label flex items-center gap-2 border border-border/50 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                SYSTEM OPERATIONAL
              </div>
              <div className="technical-label flex items-center gap-2 border border-border/50 px-3 py-1 rounded-full">
                <Lock className="w-3 h-3" />
                END-TO-END ENCRYPTION
              </div>
              <div className="technical-label flex items-center gap-2 border border-border/50 px-3 py-1 rounded-full">
                <Database className="w-3 h-3" />
                ZERO DATA RETENTION
              </div>
            </div>

            {/* Main Headline */}
            <div className="border-box border-border/50">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight headline-text">
                EVEN DRUG DEALERS NEED
                <br />
                <span className="text-accent">ACCURATE BOOKS</span>
              </h1>
            </div>

            <p className="text-xl text-text-secondary max-w-2xl mx-auto body-copy">
              Privacy-first CRM and POS for businesses that operate in the real world.
              <br />
              We don't ask questions. We balance books.
            </p>
          </div>

          {/* Waitlist Form */}
          <div className="glass-effect max-w-md mx-auto p-1 rounded-xl">
            <div className="bg-card/50 backdrop-blur-sm border-border/50 rounded-lg p-6">
              {joined ? (
                <div className="py-8 text-center space-y-4 animate-in zoom-in duration-300">
                  <div className="bg-green-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-green-500">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold headline-text">ACCESS GRANTED</h3>
                  <p className="text-text-secondary body-copy">
                    Your request has been logged. Stand by for further instructions.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex flex-col space-y-2 text-left">
                    <label htmlFor="email" className="technical-label">
                      REQUEST ACCESS
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="email"
                        type="email"
                        placeholder="OPERATOR@SECURE.LINE"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-background border-border/50 flex-1"
                      />
                      <Button type="submit" disabled={loading} className="laser-button bg-accent hover:bg-accent-light text-background">
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ArrowRight className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-text-meta body-copy">
                      Priority access for verified operators. No spam. No questions.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Feature Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
            {/* Security Card */}
            <div className="luminosity-card bg-card/50 p-6 rounded-xl text-left">
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-accent/10 text-accent w-fit">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg headline-text">SECURITY THAT MINDS ITS BUSINESS</h3>
                <p className="text-sm text-text-secondary body-copy">
                  Military-grade encryption. Zero data retention. We forget what we see.
                </p>
              </div>
            </div>

            {/* Inventory Card */}
            <div className="luminosity-card bg-card/50 p-6 rounded-xl text-left">
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-accent/10 text-accent w-fit">
                  <BarChart className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg headline-text">INVENTORY THAT ACTUALLY ADDS UP</h3>
                <p className="text-sm text-text-secondary body-copy">
                  Track every gram, every dollar. Discrepancies are not an option.
                </p>
              </div>
            </div>

            {/* Credit Card */}
            <div className="luminosity-card bg-card/50 p-6 rounded-xl text-left">
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-accent/10 text-accent w-fit">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg headline-text">CREDIT WITHOUT CHAOS</h3>
                <p className="text-sm text-text-secondary body-copy">
                  Extend lines. Track payments. No surprises. No excuses.
                </p>
              </div>
            </div>

            {/* POS Card */}
            <div className="luminosity-card bg-card/50 p-6 rounded-xl text-left">
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-accent/10 text-accent w-fit">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg headline-text">LIGHTNING FAST POS</h3>
                <p className="text-sm text-text-secondary body-copy">
                  Ring up sales before the customer changes their mind.
                </p>
              </div>
            </div>

            {/* Analytics Card */}
            <div className="luminosity-card bg-card/50 p-6 rounded-xl text-left">
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-accent/10 text-accent w-fit">
                  <Database className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg headline-text">AI THAT KEEPS QUIET</h3>
                <p className="text-sm text-text-secondary body-copy">
                  Smart insights. Dumb questions. Your data stays yours.
                </p>
              </div>
            </div>

            {/* Compliance Card */}
            <div className="luminosity-card bg-card/50 p-6 rounded-xl text-left">
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-accent/10 text-accent w-fit">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg headline-text">COMPLIANCE ON YOUR TERMS</h3>
                <p className="text-sm text-text-secondary body-copy">
                  Stay ahead of regulations without leaving a paper trail.
                </p>
              </div>
            </div>
          </div>

          {/* Social Proof */}
          <div className="pt-16 text-center space-y-6">
            <h3 className="technical-label text-text-meta">TRUSTED BY OPERATORS WHO KNOW BETTER</h3>
            <div className="flex justify-center items-center gap-4 flex-wrap">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="w-12 h-12 rounded-full bg-muted border-2 border-border/50 overflow-hidden">
                  <Image
                    src={`https://i.pravatar.cc/150?img=${i + 1}`}
                    alt={`Operator ${i + 1}`}
                    width={48}
                    height={48}
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-sm text-text-meta border-t border-border/40 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center max-w-6xl mx-auto px-6 gap-4">
          <p>© {new Date().getFullYear()} Wrelik Brands LLC. All rights reserved.</p>
          <div className="flex gap-6 technical-label">
            <Link href="/privacy" className="hover:text-accent transition-colors">PRIVACY</Link>
            <Link href="/terms" className="hover:text-accent transition-colors">TERMS</Link>
            <Link href="/accessibility" className="hover:text-accent transition-colors">ACCESSIBILITY</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
