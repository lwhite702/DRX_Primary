import { BarChart, Users, Zap, Shield, Box, CreditCard } from "lucide-react";

export function Features() {
  const features = [
    {
      title: "SECURITY THAT MINDS ITS BUSINESS",
      description: "No unnecessary data collection. Your business stays yours.",
      icon: Shield,
    },
    {
      title: "INVENTORY THAT ACTUALLY MOVES",
      description: "Track stock changes in real time without guessing.",
      icon: Box,
    },
    {
      title: "CREDIT WITHOUT CHAOS",
      description: "Record pay-later balances clearly and privately.",
      icon: CreditCard,
    },
    {
      title: "CLIENTS WHO DON'T WANT EMAILS",
      description: "CRM built for discretion and speed, not spam.",
      icon: Users,
    },
    {
      title: "ANALYTICS THAT DON'T NARK",
      description: "Operational insights for your eyes only.",
      icon: BarChart,
    },
    {
      title: "MOBILE FIRST. ALWAYS.",
      description: "Runs on any device. Dark mode by default.",
      icon: Zap,
    },
  ];

  return (
    <section id="features" className="py-24 px-6 bg-black">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16">
          <h2 className="text-3xl font-bold tracking-tighter text-white uppercase mb-2">
            Features That Mind Their Business
          </h2>
          <p className="text-muted-foreground font-mono text-sm">
            HARDENED TOOLS FOR OPERATORS.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="group bg-[#0A0A0A] border border-white/10 p-8 hover:border-[#BFFF00]/50 transition-colors duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-0 bg-[#BFFF00] group-hover:h-full transition-all duration-300" />

              <div className="mb-6 p-3 bg-[#BFFF00]/10 w-fit rounded text-[#BFFF00]">
                <feature.icon className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
