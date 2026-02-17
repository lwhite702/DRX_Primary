"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Hero } from "@/components/marketing/hero";
import { Features } from "@/components/marketing/features";
import { Security } from "@/components/marketing/security";
import { Pricing } from "@/components/marketing/pricing";

export default function LandingPage() {
  return (
    <div className="bg-black text-white relative overflow-x-hidden font-sans min-h-screen">
      {/* Noise Overlay */}
      <div className="noise-overlay pointer-events-none fixed inset-0 z-50 opacity-[0.03]"></div>

      <main className="flex-1 relative z-10">
        <Hero />
        <Features />
        <Security />
        {/* Placeholder for "What They're Not Saying" if added later */}
        <Pricing />

        {/* FINAL CTA */}
        <section className="py-32 px-6 text-center space-y-8 bg-[#050505] border-t border-white/10">
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-white">
              READY TO KEEP SECRETS?
            </h2>
            <p className="text-muted-foreground text-lg">
              Software that understands how business actually works.
            </p>
            <Link href="/login">
              <Button
                size="lg"
                className="mt-8 bg-[#BFFF00] text-black hover:bg-[#8FBF00] text-lg px-12 py-8 rounded-full font-bold tracking-widest uppercase hover:shadow-[0_0_30px_#BFFF00] transition-all duration-300"
              >
                Start With DeelRx
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-white/10 bg-black text-xs font-mono">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col gap-2">
            <h4 className="font-bold text-white text-lg">DRX</h4>
            <div className="flex gap-4 tracking-widest text-muted-foreground">
              <span>
                OPERATIONAL STATUS:{" "}
                <span className="text-[#BFFF00]">ACTIVE</span>
              </span>
            </div>
            <p className="text-muted-foreground mt-2 opacity-50">
              © 2026 DeelRx. All rights reserved.
            </p>
          </div>
          <div className="flex gap-8 font-bold tracking-widest text-muted-foreground uppercase">
            <Link
              href="/privacy"
              className="hover:text-[#BFFF00] transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hover:text-[#BFFF00] transition-colors"
            >
              Terms
            </Link>
            <Link
              href="mailto:support@deelrx.com"
              className="hover:text-[#BFFF00] transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
