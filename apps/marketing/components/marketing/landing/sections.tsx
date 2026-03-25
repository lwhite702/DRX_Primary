import Link from "next/link";
import Image from "next/image";

import { marketingContent } from "@/lib/marketing-content";

const heroAvatar1 = "https://www.figma.com/api/mcp/asset/eb987189-9d14-4364-af5f-566dc681eb73";
const heroAvatar2 = "https://www.figma.com/api/mcp/asset/638bbcbb-8ddc-4dee-ba40-76c2239a540f";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex rounded-full border border-white/15 bg-surface-elevated px-4 py-1 text-[11px] font-mono uppercase tracking-[0.2em] text-accent">
      {children}
    </p>
  );
}

function HeroNavbar() {
  return (
    <div className="mx-auto w-full max-w-[1240px] rounded-[20px] border border-white/15 bg-[#171717]/90 p-2 shadow-[0_8px_20px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 rounded-xl px-3 py-2">
          <Image
            src="/brand/drx-wordmark-color.svg"
            alt="Deelrx CRM"
            width={116}
            height={24}
            className="h-6 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-white/90 md:flex">
          <Link href="/#features" className="transition hover:text-accent">
            Benefits
          </Link>
          <Link href="/#how-it-works" className="transition hover:text-accent">
            How-it-Works
          </Link>
          <Link href="/#beta-access" className="transition hover:text-accent">
            Beta Access
          </Link>
          <Link href="/#docs" className="transition hover:text-accent">
            FAQ
          </Link>
        </nav>

        <Link
          href="/beta"
          className="inline-flex h-10 items-center justify-center rounded-2xl border border-accent/40 bg-accent px-5 text-sm font-bold text-black shadow-[0_10px_22px_rgba(204,255,0,0.2)] transition hover:brightness-95"
        >
          Take the first step
        </Link>
      </div>
    </div>
  );
}

function LimeButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center justify-center rounded-2xl border border-accent/40 bg-accent px-6 text-sm font-bold uppercase tracking-wide text-black shadow-[0_16px_30px_rgba(204,255,0,0.22)] transition hover:brightness-95"
    >
      {label}
    </Link>
  );
}

function GhostButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/20 bg-white/[0.02] px-6 text-sm font-semibold uppercase tracking-wide text-white transition hover:border-accent/60 hover:text-accent"
    >
      {label}
    </Link>
  );
}

function HeroSection() {
  const { hero } = marketingContent;

  return (
    <section className="relative mx-auto w-full max-w-[1280px] overflow-hidden px-6 pb-20 pt-8 md:pb-24 md:pt-10">
      <div className="pointer-events-none absolute inset-0 opacity-25">
        <div className="h-full w-full bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:92px_92px]" />
      </div>
      <div className="pointer-events-none absolute left-[-140px] top-[-120px] size-[280px] rounded-full bg-accent/15 blur-[80px]" />
      <div className="pointer-events-none absolute right-[-160px] top-[-100px] size-[320px] rounded-full bg-support/20 blur-[90px]" />
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent" />

      <HeroNavbar />

      <article className="absolute left-[-10px] top-[360px] z-10 hidden w-[250px] rotate-12 rounded-[24px] border border-white/15 bg-gradient-to-br from-[#1e1e1e] to-[#141414] p-4 shadow-[0_20px_45px_rgba(0,0,0,0.35)] lg:block lg:left-[-18px] lg:w-[300px]">
        <p className="text-[11px] leading-relaxed text-text-secondary">
          DRX helped us stop chasing spreadsheets and move faster every shift.
        </p>
        <div className="mt-3 border-t border-white/10 pt-3">
          <div className="flex items-center gap-2">
            <img src={heroAvatar1} alt="" className="size-9 rounded-full border border-white/20 object-cover" />
            <div>
              <p className="text-xs font-semibold text-white">Alex M., Operator</p>
              <p className="text-[11px] text-accent">★★★★★</p>
            </div>
          </div>
        </div>
      </article>

      <article className="absolute right-[-20px] top-[300px] z-10 hidden w-[270px] -rotate-12 rounded-[24px] border border-white/15 bg-gradient-to-br from-[#1e1e1e] to-[#141414] p-4 shadow-[0_20px_45px_rgba(0,0,0,0.35)] lg:block lg:w-[330px]">
        <p className="text-sm leading-relaxed text-text-secondary">
          We now know what is moving, what is low, and what needs action before problems stack up.
        </p>
        <div className="mt-3 border-t border-white/10 pt-3">
          <div className="flex items-center gap-2">
            <img src={heroAvatar2} alt="" className="size-11 rounded-full border border-white/20 object-cover" />
            <div>
              <p className="text-sm font-semibold text-white">Jamie T., Store Lead</p>
              <p className="text-xs text-accent">★★★★★</p>
            </div>
          </div>
        </div>
      </article>

      <div className="relative z-20 mx-auto max-w-[980px] pt-12 text-center md:pt-16">
        <SectionLabel>{hero.preheadline}</SectionLabel>
        <h1 className="mt-6 text-4xl font-bold leading-[1.06] tracking-[-0.03em] text-white md:text-[76px]">
          {hero.headline}
        </h1>
        <p className="mx-auto mt-5 max-w-[860px] text-base text-text-secondary md:text-xl md:leading-[1.35]">
          {hero.subheadline}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <LimeButton href={hero.primaryCta.href} label={hero.primaryCta.label} />
          <GhostButton href={hero.secondaryCta.href} label={hero.secondaryCta.label} />
        </div>

        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-text-muted">No credit card required</p>

        <div id="demo" className="mt-5 flex items-center justify-center gap-2 text-xs text-text-muted">
          <span className="text-accent">★★★★★</span>
          <span>1k+ rating from early users</span>
        </div>
      </div>

      <div className="relative z-20 mx-auto mt-16 grid max-w-[1140px] grid-cols-2 gap-4 opacity-40 md:grid-cols-4">
        {["Aplux Studio", "Aplux Studio", "Aplux Studio", "Aplux Studio"].map((logo, index) => (
          <div key={index} className="flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-3 py-4">
            <span className="text-lg font-semibold text-white/65">{logo}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function BenefitsSection() {
  return (
    <section id="features" className="mx-auto w-full max-w-[1280px] px-6 py-14 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <SectionLabel>Core Benefits</SectionLabel>
        <h2 className="mt-4 text-[34px] font-bold text-white md:text-[52px]">Why teams choose DRX</h2>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {marketingContent.benefits.map((benefit) => (
          <article
            key={benefit.title}
            className="rounded-[26px] border border-white/15 bg-gradient-to-b from-surface-elevated to-surface px-5 pb-6 pt-5"
          >
            <div className="mb-4 inline-flex size-9 items-center justify-center rounded-full bg-accent/10 text-accent">
              +
            </div>
            <h3 className="text-lg font-semibold text-white">{benefit.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">{benefit.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-[1280px] px-6 py-14 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <SectionLabel>How It Works</SectionLabel>
        <h2 className="mt-4 text-[34px] font-bold text-white md:text-[52px]">Simple setup. Real control.</h2>
      </div>

      <div className="mt-10 space-y-4">
        {marketingContent.howItWorks.map((step, index) => (
          <article
            key={step.title}
            className="grid gap-4 rounded-[28px] border border-white/15 bg-gradient-to-b from-surface-elevated to-surface p-5 md:grid-cols-2 md:p-7"
          >
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Step {index + 1}</p>
              <h3 className="mt-2 text-3xl font-semibold text-white">{step.title}</h3>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary">{step.body}</p>
              <div className="mt-5">
                <LimeButton href={step.cta.href} label={step.cta.label} />
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/35 p-5">
              <div className="space-y-3">
                <div className="h-2.5 w-4/5 rounded-full bg-white/15" />
                <div className="h-2.5 w-3/5 rounded-full bg-white/10" />
                <div className="h-2.5 w-2/5 rounded-full bg-accent/40" />
              </div>
              <div className="mt-6 h-32 rounded-2xl border border-white/10 bg-gradient-to-br from-accent/15 to-transparent" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function BetaAccessSection() {
  const section = marketingContent.betaAccess;

  return (
    <section id="beta-access" className="mx-auto w-full max-w-[1280px] px-6 py-14 md:py-20">
      <div className="rounded-[36px] border border-white/15 bg-gradient-to-b from-surface-elevated to-surface p-7 md:p-10">
        <div className="text-center">
          <SectionLabel>Beta Access</SectionLabel>
          <h2 className="mt-4 text-[34px] font-bold text-white md:text-[52px]">{section.title}</h2>
          <p className="mx-auto mt-4 max-w-3xl text-text-secondary">{section.lead}</p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-black/35 p-5">
            <h3 className="text-xl font-semibold text-white">What you get</h3>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              {section.whatYouGet.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-white/10 bg-black/35 p-5">
            <h3 className="text-xl font-semibold text-white">Who it is for</h3>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              {section.whoItsFor.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </article>
        </div>

        <p className="mt-6 text-center text-sm text-text-secondary">{section.limitedSpots}</p>

        <div className="mt-6 flex justify-center">
          <LimeButton href={section.cta.href} label={section.cta.label} />
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="docs" className="mx-auto w-full max-w-[840px] px-6 py-14 md:py-20">
      <div className="text-center">
        <SectionLabel>Frequently Asked Questions</SectionLabel>
        <h2 className="mt-4 text-[34px] font-bold text-white md:text-[52px]">Answers without the runaround</h2>
      </div>

      <div className="mt-10 space-y-3">
        {marketingContent.faq.map((item) => (
          <details
            key={item.question}
            className="group rounded-2xl border border-white/15 bg-gradient-to-b from-surface-elevated to-surface p-5"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-white md:text-lg">
              <span>{item.question}</span>
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-accent/10 text-accent">+</span>
            </summary>
            <p className="mt-3 border-t border-white/10 pt-3 text-sm leading-relaxed text-text-secondary">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

function ClosingCtaSection() {
  return (
    <section className="mx-auto w-full max-w-[1280px] px-6 py-14 md:py-20">
      <div className="rounded-[36px] border border-white/15 bg-gradient-to-b from-surface-elevated to-surface px-6 py-12 text-center md:px-12">
        <SectionLabel>Take The First Step</SectionLabel>
        <h2 className="mt-4 text-[34px] font-bold text-white md:text-[52px]">Ready to run tighter every day?</h2>
        <p className="mx-auto mt-4 max-w-2xl text-text-secondary">
          Join the beta and shape the tool with us while access is still open.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <LimeButton href="/beta" label="Join the Beta" />
          <GhostButton href="/#docs" label="Read the FAQ" />
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  const footer = marketingContent.footer;

  return (
    <footer className="mx-auto w-full max-w-[1280px] px-6 pb-16 pt-8">
      <div className="rounded-[32px] border border-white/15 bg-gradient-to-b from-[#111] to-[#0a0a0a] p-7 md:p-9">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="text-xl font-bold text-white">Deelrx CRM</p>
            <p className="mt-3 max-w-xl text-sm text-text-secondary">{footer.about}</p>
            <p className="mt-4 text-sm text-text-muted">{footer.disclaimer}</p>
          </div>

          <div>
            <p className="text-xs font-mono uppercase tracking-[0.22em] text-accent">Menu</p>
            <div className="mt-3 space-y-2 text-sm">
              {footer.menuLinks.map((link) => (
                <Link key={link.label} href={link.href} className="block text-text-secondary hover:text-accent">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-mono uppercase tracking-[0.22em] text-accent">Resources</p>
            <div className="mt-3 space-y-2 text-sm">
              {footer.resourceLinks.map((link) => (
                <Link key={link.label} href={link.href} className="block text-text-secondary hover:text-accent">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 border-t border-white/10 pt-6 md:grid-cols-3">
          <div className="text-sm text-text-secondary">{footer.contact}</div>
          <div className="flex flex-wrap gap-4 text-sm">
            {footer.legalLinks.map((link) => (
              <Link key={link.label} href={link.href} className="text-text-secondary hover:text-accent">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap justify-start gap-4 text-sm md:justify-end">
            {footer.socialLinks.map((link) => (
              <Link key={link.label} href={link.href} className="text-text-secondary hover:text-accent">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LandingPageSections() {
  return (
    <>
      <HeroSection />
      <BenefitsSection />
      <HowItWorksSection />
      <BetaAccessSection />
      <FaqSection />
      <ClosingCtaSection />
      <LandingFooter />
    </>
  );
}
