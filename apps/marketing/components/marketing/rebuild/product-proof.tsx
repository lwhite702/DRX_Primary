import Image from "next/image";

/**
 * The hero artwork is an export of the approved Figma product-proof frame
 * (node 97:6): the Home and New sale screens are shown together so the
 * illustration reflects the real DRX information architecture.
 */
export function MarketingProductProof() {
  return (
    <figure
      className="w-full min-w-0 max-w-[600px] text-left"
      aria-label="DRX Home and New sale screens from the approved product design"
    >
      <div className="relative overflow-hidden rounded-[24px] border border-border-hover/80 bg-background/70 p-2 shadow-2xl shadow-black/40 sm:p-4">
        <Image
          src="/illustrations/drx-hero-figma.png"
          alt="DRX Home and New sale screens shown together in the approved dark product design"
          width={600}
          height={558}
          priority
          className="h-auto w-full"
        />
      </div>
      <figcaption className="mt-3 text-center text-xs leading-5 text-muted-foreground">
        Illustrative product screens from the approved DRX design.
      </figcaption>
    </figure>
  );
}
