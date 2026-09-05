"use client";

const steps = [
  {
    id: "01",
    title: "Protect Access",
    description:
      "Secure sign-in and role checks protect supported team actions.",
  },
  {
    id: "02",
    title: "Protect Sensitive Fields",
    description:
      "Configured encryption protects sensitive customer fields without making blanket claims about every record.",
  },
  {
    id: "03",
    title: "Review Activity",
    description:
      "Supported adjustments and team actions retain user context for operational review.",
  },
];

export function ContrastSection() {
  return (
    <section className="relative w-full bg-[#E5E5E5] text-black rounded-t-[4rem] px-6 py-24 md:py-32 -mt-12 z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
        {/* Left: Methodology Steps */}
        <div className="space-y-12">
          <h2 className="text-5xl md:text-7xl font-sans font-bold tracking-tighter mb-16">
            OPERATOR
            <br />
            CONTROL
          </h2>

          <div className="space-y-10">
            {steps.map((step) => (
              <div key={step.id} className="flex gap-6 group cursor-default">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full border border-black/20 flex items-center justify-center font-mono text-xl font-bold group-hover:bg-black group-hover:text-white transition-colors duration-300">
                    {step.id}
                  </div>
                </div>
                <div className="pt-2">
                  <h3 className="text-2xl font-bold mb-2">{step.title}</h3>
                  <p className="text-black/60 leading-relaxed max-w-md">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Abstract/Philosophy Visual */}
        <div className="relative h-full min-h-[500px] flex items-center justify-center">
          <div className="relative w-full aspect-square max-w-md">
            {/* Visual Abstract Elements */}
            <div className="absolute inset-0 border border-black/10 rounded-full animate-[spin_60s_linear_infinite]" />
            <div className="absolute inset-8 border border-black/10 rounded-full animate-[spin_40s_linear_infinite_reverse]" />
            <div className="absolute inset-16 border border-black/10 rounded-full animate-[spin_20s_linear_infinite]" />

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center p-8 backdrop-blur-sm bg-white/50 rounded-2xl border border-black/5 shadow-xl">
              <p className="font-mono text-sm uppercase tracking-widest mb-4">
                Philosophy
              </p>
              <p className="text-xl font-medium leading-tight">
                "Built for independent retailers who need speed on the floor
                and clear records after the rush."
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
