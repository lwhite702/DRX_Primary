import { cyberContrastSteps } from "@/components/marketing/landing/cyber-data";

export function ContrastSteps() {
  return (
    <section id="flow" className="bg-[#e5e5e5] py-20 text-[#0a0a0a]">
      <div className="mx-auto w-full max-w-6xl px-6">
        <p className="technical-label text-[10px] text-black/70">How DRX Runs Daily Work</p>
        <h2 className="mt-4 font-sans text-[clamp(2rem,5vw,3.5rem)] font-bold uppercase leading-[0.95] tracking-[-0.03em]">
          Clear Flow. No Guesswork.
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-black/70">
          DRX keeps operator decisions simple during live hours and traceable when you
          review the day.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {cyberContrastSteps.map((step, index) => (
            <article key={step.id} className="rounded-3xl border-2 border-black/15 bg-white/70 p-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-black text-xl font-bold">
                {String(index + 1).padStart(2, "0")}
              </div>
              <h3 className="mt-6 text-xl font-bold uppercase leading-tight">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-black/70">{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
