"use client";

import { Check } from "lucide-react";
import { Button } from "@deelrx/ui";

export function Pricing() {
  return (
    <section id="pricing" className="py-32 px-6 bg-black">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-white uppercase">
            Beta Access Is Open
          </h2>
          <p className="text-muted-foreground mt-4 font-mono text-sm">
            PUBLIC PLANS ARE NOT YET PUBLISHED.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-center">
          {/* Starter */}
          <div className="p-8 border border-white/10 rounded-2xl bg-[#050505] hover:border-white/20 transition-all">
            <h3 className="text-xl font-bold text-white mb-2">Beta Access</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold text-white">Free</span>
              <span className="text-sm text-muted-foreground">during beta</span>
            </div>
            <ul className="space-y-3 mb-8 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> Focused onboarding
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> Current beta features
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> Product feedback channel
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> Beta release updates
              </li>
            </ul>
            <Button
              variant="outline"
              className="w-full border-white/10 hover:bg-white/5"
            >
              Join the Beta
            </Button>
          </div>

          {/* Operator (Highlight) */}
          <div className="p-8 border-2 border-[#BFFF00] rounded-2xl bg-[#050505] relative shadow-[0_0_50px_rgba(191,255,0,0.1)] transform md:-translate-y-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#BFFF00] text-black text-[10px] font-bold uppercase py-1 px-3 rounded-full tracking-wider">
              Recommended
            </div>
            <h3 className="text-xl font-bold text-[#BFFF00] mb-2">Public Plans</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-bold text-white">TBD</span>
            </div>
            <ul className="space-y-3 mb-8 text-sm text-white">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> Pricing announced before launch
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> Clear feature scope
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> No surprise plan claims
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> Published beta limitations
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> Release notes and support
              </li>
            </ul>
            <Button className="w-full bg-[#BFFF00] text-black hover:bg-[#8FBF00] font-bold">
              Request Access
            </Button>
          </div>

          {/* Custom */}
          <div className="p-8 border border-white/10 rounded-2xl bg-[#050505] hover:border-white/20 transition-all">
            <h3 className="text-xl font-bold text-white mb-2">Team Rollout</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold text-white">Custom</span>
            </div>
            <ul className="space-y-3 mb-8 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> Workflow review
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> Role setup guidance
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> Support-channel planning
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> Scope confirmed in writing
              </li>
            </ul>
            <Button
              variant="outline"
              className="w-full border-white/10 hover:bg-white/5"
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
