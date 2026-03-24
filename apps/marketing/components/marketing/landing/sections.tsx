import Link from "next/link";

import { appWaitlistUrl } from "@/lib/app-links";

const heroStats = [
  { label: "Fast launch paths", value: "Express or core" },
  { label: "What it replaces", value: "Site + forms + booking + payments" },
  { label: "Best for", value: "Small businesses that need to start earning" },
];

const painPoints = [
  "A basic website goes live, but leads still fall through the cracks.",
  "Booking, forms, hosting, checkout, and updates all live in different tools.",
  "Agency projects drag on for weeks while the business still needs revenue now.",
];

const systemPillars = [
  {
    title: "Website foundation",
    copy:
      "A structured, mobile-ready site built to explain what you do and move people toward action.",
  },
  {
    title: "Lead capture built in",
    copy:
      "Inquiry forms, calls to action, and funnel pages work together instead of sending people into a dead end.",
  },
  {
    title: "Booking and buying paths",
    copy:
      "Give customers a clear next step whether they need to book, request a quote, pay, or buy.",
  },
  {
    title: "Managed backend",
    copy:
      "Hosting, updates, and the core setup stay organized so you are not babysitting plugins and logins.",
  },
];

const walkthroughSteps = [
  {
    label: "Launch",
    headline: "Get a clean business site live without a drawn-out build.",
    paragraphs: [
      "Pixel Pronto starts with the core pages a small business actually needs: a homepage, service or offer sections, clear calls to action, and a mobile-ready structure that looks legitimate from day one.",
      "Instead of spending weeks piecing together themes, copy blocks, and forms, you move into a guided launch path with a defined scope and a much faster route to publish.",
    ],
    result: "Result: you stop sitting on an idea and start sending people to a real site.",
    visualTitle: "Launch preview",
    visualBody: "Homepage modules, trust points, and a launch checklist lined up in one build flow.",
    visualItems: ["Homepage approved", "Mobile layout ready", "Domain connected", "Launch checklist 92%"],
  },
  {
    label: "Capture",
    headline: "Turn visitors into leads instead of hoping they remember you later.",
    paragraphs: [
      "Every page should have a job. Pixel Pronto connects contact forms, lead magnets, landing pages, and follow-up paths so interested visitors can raise their hand right away.",
      "That means fewer lost inquiries, fewer dead-end pages, and a better chance that traffic becomes real conversations.",
    ],
    result: "Result: more of your traffic becomes trackable leads you can actually follow up with.",
    visualTitle: "Lead flow",
    visualBody: "A visitor lands, fills a form, gets routed to the right next step, and the lead is stored in one place.",
    visualItems: ["Homepage CTA", "Lead form", "Thank-you step", "Saved to dashboard"],
  },
  {
    label: "Convert",
    headline: "Give customers a clear way to book, buy, or request the next step.",
    paragraphs: [
      "When someone is ready, Pixel Pronto helps remove friction. Depending on the setup, that can mean a booking flow, a payment or checkout step, a quote request, or a service inquiry path.",
      "The goal is simple: make it obvious how to do business with you and shorten the distance between interest and revenue.",
    ],
    result: "Result: inquiries turn into scheduled jobs, paid orders, or qualified opportunities faster.",
    visualTitle: "Conversion path",
    visualBody: "Offer page, calendar or checkout step, confirmation, and payment-ready handoff.",
    visualItems: ["Offer selected", "Time picked", "Deposit collected", "Confirmation sent"],
  },
  {
    label: "Manage",
    headline: "Keep the moving parts cleaner after launch.",
    paragraphs: [
      "A good site is not just something you publish and ignore. Pixel Pronto is designed to keep hosting, updates, lead flow visibility, and key business actions easier to manage without jumping across a pile of tools.",
      "That makes the system more practical for a small team that needs reliability without becoming accidental tech support.",
    ],
    result: "Result: less tool chaos, less backtracking, and a business system that stays usable.",
    visualTitle: "Management view",
    visualBody: "Recent leads, launch assets, site requests, and system status gathered in a single operating view.",
    visualItems: ["3 new leads", "1 site update", "Hosting healthy", "Bookings syncing"],
  },
] as const;

const outcomeBlocks = [
  {
    eyebrow: "Get found and look legitimate",
    title: "A polished web presence that gives small businesses a stronger first impression.",
    copy:
      "Pixel Pronto gives you a modern, structured site that is easier to trust, easier to navigate, and built to help customers understand what you offer quickly.",
    bullets: [
      "Core pages planned around your business, not a blank template",
      "Mobile-ready layouts that hold up on the devices customers actually use",
      "Clear service, offer, and contact paths",
      "Brand-forward presentation without a custom-agency timeline",
    ],
    mockup: {
      label: "Website preview",
      details: ["Hero + offer stack", "Service proof band", "Sticky call-to-action", "Mobile page view"],
    },
  },
  {
    eyebrow: "Turn visitors into leads",
    title: "Lead capture is part of the system, not an afterthought.",
    copy:
      "Forms, landing pages, and call-to-action flows are set up to help more visitors raise their hand while the business is still top of mind.",
    bullets: [
      "Inquiry and contact forms built into key pages",
      "Landing page and funnel support for focused campaigns",
      "Lead-routing flows that reduce missed opportunities",
      "Thank-you and next-step logic that keeps momentum going",
    ],
    mockup: {
      label: "Contact flow",
      details: ["Ad or social click", "Landing page", "Lead captured", "Follow-up queued"],
    },
  },
  {
    eyebrow: "Let customers book, buy, or reach out",
    title: "Make the next step obvious when someone is ready to act.",
    copy:
      "Pixel Pronto supports practical conversion paths so customers can schedule, pay, request a quote, or start an order without hunting around the site.",
    bullets: [
      "Optional booking flow for appointment-based businesses",
      "Checkout or payment-ready paths where needed",
      "Strong call-to-action placement throughout the site",
      "Conversion pages designed to reduce drop-off",
    ],
    mockup: {
      label: "Booking + payment",
      details: ["Select service", "Choose time", "Complete deposit", "Receive confirmation"],
    },
  },
  {
    eyebrow: "Keep your business organized",
    title: "See the work behind the website without logging into five different systems.",
    copy:
      "From captured leads to launch tasks and customer actions, Pixel Pronto is positioned as one cleaner operating system instead of a scattered stack of disconnected subscriptions.",
    bullets: [
      "Lead and inquiry visibility in one place",
      "Managed hosting and infrastructure handling",
      "Simple updates and ongoing support paths",
      "Optional blog, ecommerce, and expansion modules when needed",
    ],
    mockup: {
      label: "Operations dashboard",
      details: ["Lead queue", "Updates board", "Payments snapshot", "Site status"],
    },
  },
  {
    eyebrow: "Run it without tech chaos",
    title: "Replace the patchwork with one faster, clearer path.",
    copy:
      "Instead of buying separate tools for hosting, forms, calendar links, checkout pages, and maintenance, Pixel Pronto helps small businesses launch with a simpler setup that is easier to understand and easier to keep running.",
    bullets: [
      "Fewer vendors and logins to manage",
      "Less plugin and integration guesswork",
      "Clearer ownership of your launch scope",
      "A practical done-for-you setup with room to grow",
    ],
    mockup: {
      label: "System map",
      details: ["Website", "Lead capture", "Booking", "Payments", "Hosting"],
    },
  },
] as const;

const includedItems = [
  "Structured business website with the core pages most small businesses need",
  "Responsive mobile optimization",
  "Domain and hosting handling",
  "Lead capture setup for inquiries and contact flows",
  "Clear launch scope with a faster delivery path",
  "Managed infrastructure and post-launch support path",
  "Optional booking, blog, and ecommerce upgrades when the business needs more",
];

const alternativeCards = [
  {
    title: "Typical agency build",
    pain: "Long timelines, more meetings, and more back-and-forth before anything starts earning.",
    win: "Pixel Pronto keeps scope tighter so launch happens sooner.",
  },
  {
    title: "DIY site builder route",
    pain: "You still have to figure out structure, copy, forms, setup, integrations, and the ongoing maintenance burden.",
    win: "Pixel Pronto gives you a more guided path with less guesswork.",
  },
  {
    title: "Tool-stacking everything",
    pain: "Hosting here, forms there, booking somewhere else, payments in another dashboard, and updates held together with hope.",
    win: "Pixel Pronto creates one cleaner system that is easier to run.",
  },
];

const timelineCards = [
  {
    title: "Typical custom project",
    time: "Often stretches for weeks or longer",
    bullets: ["Loose scope", "Slow approvals", "More revisions", "Revenue waits"],
  },
  {
    title: "Pixel Pronto core launch",
    time: "Structured timeline with fewer moving parts",
    bullets: ["Defined scope", "Guided content flow", "Cleaner handoff", "Faster go-live"],
  },
  {
    title: "Pixel Pronto Express fast lane",
    time: "Best path when speed matters most",
    bullets: ["Priority track", "Reduced back-and-forth", "Tight launch window", "Faster path to revenue"],
  },
];

const trustPoints = [
  "Built for small businesses that need clarity, not more software clutter",
  "Designed around real customer actions: call, book, inquire, buy, and follow up",
  "Managed so owners do not have to become hosting, plugin, and integration specialists",
];

function SectionIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="max-w-3xl">
      <p className="technical-label text-neon-lime">{eyebrow}</p>
      <h2 className="headline-text mt-4 text-[clamp(2rem,4vw,4rem)] text-white">{title}</h2>
      <p className="body-copy mt-5 text-lg text-text-secondary">{copy}</p>
    </div>
  );
}

function CTAButtons() {
  return (
    <div className="mt-8 flex flex-wrap gap-4">
      <Link
        href={appWaitlistUrl}
        className="neon-pulse-button inline-flex h-12 items-center justify-center px-7 text-sm font-semibold"
      >
        Start your launch
      </Link>
      <Link
        href="#system"
        className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-7 text-sm font-semibold text-white transition hover:border-neon-lime/50 hover:bg-white/5"
      >
        See how it works
      </Link>
    </div>
  );
}

function ProductMockup({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: readonly string[];
}) {
  return (
    <div className="glass-effect rounded-[2rem] p-5 shadow-[0_0_40px_rgba(191,255,0,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="technical-label text-neon-lime">Pixel Pronto</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{title}</h3>
        </div>
        <div className="flex gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
          <span className="h-2.5 w-2.5 rounded-full bg-neon-lime/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
        </div>
      </div>
      <p className="body-copy mt-3 text-sm text-text-secondary">{description}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.map((item, index) => (
          <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="technical-label text-[11px] text-white/45">Panel {index + 1}</p>
            <p className="mt-2 text-sm font-medium text-white">{item}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-neon-lime/20 bg-neon-lime/5 p-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-white">Guided flow connected</span>
          <span className="technical-label text-[11px] text-neon-lime">All-in-one path</span>
        </div>
      </div>
    </div>
  );
}

export function LandingPageSections() {
  return (
    <>
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-20 pt-24 md:grid-cols-[1.15fr_0.85fr] md:items-center md:pt-32">
        <div>
          <p className="technical-label text-neon-lime">Pixel Pronto</p>
          <h1 className="headline-text mt-4 text-[clamp(2.8rem,7vw,6.2rem)] text-white">
            Your business, online and earning — pronto.
          </h1>
          <p className="body-copy mt-6 max-w-2xl text-lg text-text-secondary md:text-xl">
            Launch a real small-business website, capture leads, and start taking bookings,
            inquiries, or payments fast without stitching together five different tools.
          </p>
          <div className="mt-6 grid gap-3 text-sm text-text-secondary sm:grid-cols-3">
            {heroStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="technical-label text-[11px] text-white/45">{stat.label}</p>
                <p className="mt-2 font-medium text-white">{stat.value}</p>
              </div>
            ))}
          </div>
          <CTAButtons />
          <p className="body-copy mt-4 text-sm text-text-muted">
            Fast launch path. Clear scope. Managed setup that keeps the tech mess lighter.
          </p>
        </div>
        <ProductMockup
          title="Business launch system"
          description="A realistic view of how Pixel Pronto brings site pages, lead capture, booking, payments, and ongoing management into one cleaner setup."
          items={[
            "Website preview with CTA stack",
            "Lead form routed into dashboard",
            "Booking and payment checkpoints",
            "Managed hosting + update status",
          ]}
        />
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-18" id="problem">
        <div className="grid gap-6 rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 md:grid-cols-[0.95fr_1.05fr] md:p-10">
          <SectionIntro
            eyebrow="Why many small business sites underperform"
            title="The problem is not just getting a website. It is getting a website that helps the business move."
            copy="Most small businesses do not need more complexity. They need one reliable system that gets them online quickly, captures interest, and gives customers a clear next step."
          />
          <div className="space-y-4">
            {painPoints.map((point) => (
              <div key={point} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="body-copy text-white/90">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-18" id="system">
        <SectionIntro
          eyebrow="Pixel Pronto as a business system"
          title="More than a website builder. This is a faster-launch business setup with tools that flow together naturally."
          copy="Pixel Pronto is built to reduce the confusion that happens when small businesses try to assemble hosting, forms, calendar links, checkout pages, and updates on their own."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {systemPillars.map((pillar) => (
            <article key={pillar.title} className="luminosity-card rounded-[1.75rem] bg-white/[0.03] p-6">
              <p className="technical-label text-neon-lime">System block</p>
              <h3 className="mt-3 text-xl font-semibold text-white">{pillar.title}</h3>
              <p className="body-copy mt-3 text-sm text-text-secondary">{pillar.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-18" id="walkthrough">
        <SectionIntro
          eyebrow="How it works"
          title="A guided four-step walkthrough that shows how Pixel Pronto helps a business launch and operate online."
          copy="Instead of dumping abstract features on the page, Pixel Pronto should feel like a system you can picture using."
        />
        <div className="mt-10 space-y-8">
          {walkthroughSteps.map((step, index) => (
            <div
              key={step.label}
              className="grid gap-6 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 md:grid-cols-[0.95fr_1.05fr] md:p-8"
            >
              <div className={index % 2 === 1 ? "md:order-2" : ""}>
                <p className="technical-label text-neon-lime">
                  Step {index + 1} · {step.label}
                </p>
                <h3 className="mt-4 text-3xl font-semibold text-white">{step.headline}</h3>
                <div className="body-copy mt-4 space-y-4 text-text-secondary">
                  {step.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                <p className="mt-5 rounded-2xl border border-neon-lime/20 bg-neon-lime/5 p-4 text-sm font-medium text-white">
                  {step.result}
                </p>
                <div className="mt-5">
                  <Link
                    href={appWaitlistUrl}
                    className="inline-flex items-center text-sm font-semibold text-neon-lime transition hover:text-white"
                  >
                    Start this step with Pixel Pronto →
                  </Link>
                </div>
              </div>
              <div className={index % 2 === 1 ? "md:order-1" : ""}>
                <ProductMockup
                  title={step.visualTitle}
                  description={step.visualBody}
                  items={step.visualItems}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-18" id="features">
        <SectionIntro
          eyebrow="Outcome-led features"
          title="Everything included should feel tied to an actual business outcome."
          copy="These sections explain what the customer gets, why it matters, and how Pixel Pronto works as an easier alternative to a scattered stack."
        />
        <div className="mt-10 space-y-6">
          {outcomeBlocks.map((block) => (
            <article
              key={block.title}
              className="grid gap-6 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 md:grid-cols-[1fr_0.9fr] md:p-8"
            >
              <div>
                <p className="technical-label text-neon-lime">{block.eyebrow}</p>
                <h3 className="mt-4 text-3xl font-semibold text-white">{block.title}</h3>
                <p className="body-copy mt-4 text-text-secondary">{block.copy}</p>
                <ul className="mt-5 space-y-3">
                  {block.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3 text-sm text-white/90">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-neon-lime" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Link
                    href={appWaitlistUrl}
                    className="inline-flex items-center text-sm font-semibold text-neon-lime transition hover:text-white"
                  >
                    Launch faster with this setup →
                  </Link>
                </div>
              </div>
              <ProductMockup
                title={block.mockup.label}
                description={block.copy}
                items={block.mockup.details}
              />
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-18" id="included">
        <div className="grid gap-6 rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 md:grid-cols-[0.9fr_1.1fr] md:p-10">
          <SectionIntro
            eyebrow="Included with Pixel Pronto"
            title="Clear scope beats vague promises."
            copy="Pixel Pronto is positioned as a practical launch package for small businesses that need a clean online setup and room to add the right extras later."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {includedItems.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/90">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-18" id="alternatives">
        <SectionIntro
          eyebrow="Why this beats the alternatives"
          title="One cleaner, faster path is better than overbuilding or duct-taping tools together."
          copy="Pixel Pronto helps small businesses skip the usual tradeoff between expensive custom builds and chaotic do-it-yourself setups."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {alternativeCards.map((card) => (
            <article key={card.title} className="luminosity-card rounded-[1.75rem] bg-white/[0.03] p-6">
              <h3 className="text-2xl font-semibold text-white">{card.title}</h3>
              <p className="body-copy mt-4 text-sm text-text-secondary">{card.pain}</p>
              <div className="mt-5 rounded-2xl border border-neon-lime/20 bg-neon-lime/5 p-4 text-sm text-white">
                {card.win}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-18" id="timeline">
        <SectionIntro
          eyebrow="Speed is part of the value"
          title="Launch sooner, reduce back-and-forth, and get to revenue faster."
          copy="Pixel Pronto should make speed feel concrete, not hand-wavy. The structure exists to shorten delays and keep decisions moving."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {timelineCards.map((card) => (
            <article key={card.title} className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
              <p className="technical-label text-neon-lime">Timeline</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">{card.title}</h3>
              <p className="body-copy mt-3 text-sm text-text-secondary">{card.time}</p>
              <ul className="mt-5 space-y-2 text-sm text-white/90">
                {card.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-neon-lime" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-18" id="trust">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 md:p-10">
          <SectionIntro
            eyebrow="Trust and reassurance"
            title="Built to feel practical, supported, and easy to understand."
            copy="Pixel Pronto should reassure visitors that this is not just another template. It is a managed launch system for small businesses that need to move with confidence."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {trustPoints.map((point) => (
              <div key={point} className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/90">
                {point}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24" id="final-cta">
        <div className="rounded-[2rem] border border-neon-lime/30 bg-neon-lime/5 p-8 text-center md:p-12">
          <p className="technical-label text-neon-lime">Ready to launch</p>
          <h2 className="headline-text mt-4 text-[clamp(2.2rem,5vw,4.8rem)] text-white">
            Get your business online and earning without the usual tech mess.
          </h2>
          <p className="body-copy mx-auto mt-5 max-w-2xl text-lg text-text-secondary">
            Start the Pixel Pronto launch path, get clear on scope fast, and move toward a site
            that helps your business book, sell, and grow.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href={appWaitlistUrl}
              className="neon-pulse-button inline-flex h-12 items-center justify-center px-7 text-sm font-semibold"
            >
              Start your launch
            </Link>
            <Link
              href="#walkthrough"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-7 text-sm font-semibold text-white transition hover:border-neon-lime/50 hover:bg-white/5"
            >
              Review the walkthrough
            </Link>
          </div>
          <p className="body-copy mt-4 text-sm text-text-muted">
            Clear next steps. Managed support. A cleaner path from idea to revenue.
          </p>
        </div>
      </section>
    </>
  );
}
