import Image from "next/image";

/**
 * The hero artwork is an export of the approved Figma product-proof frame
 * (node 97:6): the Home and New sale screens are shown together so the
 * illustration reflects the real DRX information architecture. The mobile
 * crop focuses on the sale screen so its interface labels remain readable.
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
          className="hidden h-auto w-full sm:block"
        />
        <Image
          src="/illustrations/drx-hero-figma-mobile.png"
          alt="DRX New sale screen showing product search, barcode input, and sale review"
          width={234}
          height={506}
          priority
          className="mx-auto block h-auto w-full max-w-[300px] sm:hidden"
        />
      </div>
      <figcaption className="mt-3 text-center text-xs leading-5 text-muted-foreground">
        Illustrative product screens from the approved DRX design.
      </figcaption>
    </figure>
  );
}
