"use client";

import { Button } from "@deelrx/ui";

export function Hero() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative pt-32 pb-24 md:pt-48 md:pb-32 px-6 flex flex-col items-center text-center overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#222_1px,transparent_1px),linear-gradient(to_bottom,#222_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto space-y-8">
        <h1 className="text-5xl md:text-8xl font-bold tracking-tighter leading-[0.9] text-white">
          RUN REAL <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ccff00] to-[#a3cc00] animate-pulse">
            TRANSACTIONS.
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light">
          Without the mess. <br />
          <span className="text-sm md:text-base opacity-70 font-mono mt-2 block">
            Privacy-first CRM & POS for inventory that moves fast.
          </span>
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Button
            size="lg"
            className="bg-[#ccff00] text-black hover:bg-[#a3cc00] text-lg px-8 py-6 rounded-none font-bold tracking-widest uppercase hover:shadow-[0_0_20px_rgba(204,255,0,0.5)] transition-all"
          >
            Get Set Up Quietly
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => scrollToSection("proof")}
            className="border-white/20 text-white hover:bg-white/5 text-lg px-8 py-6 rounded-none font-bold tracking-widest uppercase"
          >
            See How It Works
          </Button>
        </div>
      </div>
    </section>
  );
}
