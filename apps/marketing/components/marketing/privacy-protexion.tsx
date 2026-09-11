import { FeatureStatusChip } from "@/components/marketing/site/feature-status-chip";
import { drxPrivacy } from "@/lib/feature-canon";

export function PrivacyProtexionSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-16">
      <div className="glass-effect rounded-[2rem] p-8 md:p-10">
        <div className="mb-7">
          <h2 className="headline-text text-3xl text-white md:text-4xl">
            {drxPrivacy.title}
          </h2>
          <div className="mt-4 space-y-1">
            {drxPrivacy.brandLines.map((line) => (
              <p key={`top-${line}`} className="technical-label text-neon-lime">
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="luminosity-card rounded-2xl border border-border/60 p-5">
          {drxPrivacy.concept.map((line) => (
            <p key={line} className="body-copy text-text-secondary">
              {line}
            </p>
          ))}
          <p className="body-copy mt-3 text-lg font-semibold text-white">
            {drxPrivacy.principle}
          </p>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          {drxPrivacy.blocks.map((block) => (
            <article
              key={block.id}
              className="luminosity-card rounded-2xl border border-border/60 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-semibold text-white">
                  {block.title}
                </h3>
                <FeatureStatusChip status={block.status} showLive />
              </div>

              <p className="body-copy mt-3 text-sm text-text-secondary">
                {block.body}
              </p>

              <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-white/90">
                {block.bullets.map((bullet) => (
                  <li key={`${block.id}-${bullet}`}>{bullet}</li>
                ))}
              </ul>

              {block.examples?.length ? (
                <div className="mt-4 space-y-3">
                  {block.examples.map((example) => (
                    <div
                      key={`${block.id}-${example.label}`}
                      className="rounded-xl border border-border/60 bg-black/20 p-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-neon-lime">
                        {example.label}
                      </p>
                      <div className="mt-2 space-y-1 text-sm text-white">
                        {example.lines.map((line) => (
                          <p key={`${block.id}-${example.label}-${line}`}>
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>

        <div className="mt-7 rounded-2xl border border-neon-lime/30 bg-neon-lime/5 p-5">
          <p className="body-copy text-white">{drxPrivacy.closing}</p>
          <div className="mt-4 space-y-1">
            {drxPrivacy.brandLines.map((line) => (
              <p
                key={`bottom-${line}`}
                className="technical-label text-neon-lime"
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
