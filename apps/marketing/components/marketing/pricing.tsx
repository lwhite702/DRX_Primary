"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Pricing() {
  return (
    <section id="pricing" className="py-32 px-6 bg-black">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-white uppercase">
            Pricing That Makes Sense
          </h2>
          <p className="text-muted-foreground mt-4 font-mono text-sm">
            NO HIDDEN FEES. NO SURPRISES.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-center">
          {/* Starter */}
          <div className="p-8 border border-white/10 rounded-2xl bg-[#050505] hover:border-white/20 transition-all">
            <h3 className="text-xl font-bold text-white mb-2">Starter</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold text-white">$49</span>
              <span className="text-sm text-muted-foreground">/mo</span>
            </div>
            <ul className="space-y-3 mb-8 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> Single Operator
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> Basic Inventory
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> Cash Tracking
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> 500 Monthly Txns
              </li>
            </ul>
            <Button
              variant="outline"
              className="w-full border-white/10 hover:bg-white/5"
            >
              Get Started
            </Button>
          </div>

          {/* Operator (Highlight) */}
          <div className="p-8 border-2 border-[#BFFF00] rounded-2xl bg-[#050505] relative shadow-[0_0_50px_rgba(191,255,0,0.1)] transform md:-translate-y-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#BFFF00] text-black text-[10px] font-bold uppercase py-1 px-3 rounded-full tracking-wider">
              Recommended
            </div>
            <h3 className="text-xl font-bold text-[#BFFF00] mb-2">Operator</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-bold text-white">$149</span>
              <span className="text-sm text-muted-foreground">/mo</span>
            </div>
            <ul className="space-y-3 mb-8 text-sm text-white">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> Unlimited Operators
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> Advanced Inventory
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> Credit Management
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> Activity Logs
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> Priority Support
              </li>
            </ul>
            <Button className="w-full bg-[#BFFF00] text-black hover:bg-[#8FBF00] font-bold">
              Start Operator
            </Button>
          </div>

          {/* Custom */}
          <div className="p-8 border border-white/10 rounded-2xl bg-[#050505] hover:border-white/20 transition-all">
            <h3 className="text-xl font-bold text-white mb-2">Enterprise</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold text-white">Custom</span>
            </div>
            <ul className="space-y-3 mb-8 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> Custom Integrations
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> Dedicated Node
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> SLA Guarantee
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#BFFF00]" /> 24/7 Phone Support
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
