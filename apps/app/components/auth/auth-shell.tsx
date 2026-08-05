import Image from "next/image";
import Link from "next/link";
import { Boxes, Gauge, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { featurebaseHelpdeskUrl } from "@/lib/featurebase-links";

const marketingUrl =
  process.env.NEXT_PUBLIC_MARKETING_URL?.replace(/\/$/, "") ||
  "https://deelrxcrm.com";

const productSignals = [
  { label: "Fast checkout", icon: Gauge },
  { label: "Stock visibility", icon: Boxes },
  { label: "Role-based access", icon: UsersRound },
];

const footerLinkClassName =
  "inline-flex min-h-11 items-center underline decoration-white/30 underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

interface AuthShellProps {
  children: ReactNode;
  eyebrow: string;
  description: string;
  footer?: ReactNode;
}

export function AuthShell({
  children,
  eyebrow,
  description,
  footer,
}: AuthShellProps) {
  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-background font-sans text-foreground">
      <div
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:32px_32px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-[-12rem] top-[-14rem] size-[34rem] rounded-full bg-accent/[0.06] blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid min-h-dvh w-full max-w-[1120px] items-center gap-6 px-5 py-6 sm:gap-10 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-16 lg:py-12">
        <section className="flex flex-col justify-center lg:min-h-[640px]" aria-labelledby="auth-brand-heading">
          <Link
            href={marketingUrl}
            className="w-fit rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-background"
            aria-label="Visit the Deelrx CRM website"
          >
            <Image
              src="/brand/drx-wordmark.svg"
              alt="Deelrx CRM"
              width={178}
              height={48}
              className="h-auto w-[124px] sm:w-[178px]"
              priority
            />
          </Link>

          <div className="mt-5 max-w-[620px] lg:mt-16">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Built for independent retail
            </p>
            <h1
              id="auth-brand-heading"
              className="mt-3 max-w-[14ch] text-balance text-2xl font-extrabold leading-[1.05] tracking-[-0.04em] text-foreground sm:text-4xl lg:mt-4 lg:max-w-[12ch] lg:text-6xl"
            >
              Run the day. Keep the operation moving.
            </h1>
            <p className="mt-5 hidden max-w-[54ch] text-base leading-7 text-[#C7C7C7] sm:block sm:text-lg">
              Manage checkout, inventory, customers, and daily reporting from one focused workspace.
            </p>
          </div>

          <ul className="mt-8 hidden flex-wrap gap-3 lg:flex" aria-label="Product capabilities">
            {productSignals.map(({ label, icon: Icon }) => (
              <li
                key={label}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-[#121212] px-3.5 text-sm font-semibold text-[#E7E7E7]"
              >
                <Icon className="size-4 text-accent" strokeWidth={1.8} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </section>

        <section className="w-full self-center" aria-labelledby="auth-form-heading">
          <div className="rounded-[14px] border border-white/10 bg-[#121212]/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)] sm:p-8">
            <div className="mb-7">
              <h2 id="auth-form-heading" className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                {eyebrow}
              </h2>
              <p className="mt-2 text-base font-medium leading-6 text-[#D1D1D1]">
                {description}
              </p>
            </div>

            {children}

            {footer ? <div className="mt-6 border-t border-white/10 pt-6">{footer}</div> : null}
          </div>

          <nav
            aria-label="Legal and support links"
            className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-[#AFAFAF]"
          >
            <Link className={footerLinkClassName} href={`${marketingUrl}/legal/privacy`}>
              Privacy
            </Link>
            <Link className={footerLinkClassName} href={`${marketingUrl}/legal/terms`}>
              Terms
            </Link>
            <Link className={footerLinkClassName} href={featurebaseHelpdeskUrl}>
              Support
            </Link>
          </nav>
        </section>
      </div>
    </main>
  );
}
