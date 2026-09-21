import Image from "next/image";
import { Package, ShoppingCart } from "lucide-react";
import { drxContent } from "@deelrx/content";

/** A read-only, fictional example of the existing product list and sale basket. */
export function MarketingProductProof() {
  return (
    <figure className="w-full min-w-0 max-w-[520px] text-left" aria-label="Illustrative DRX sale with fictional data">
      <div className="overflow-hidden rounded-[20px] border border-border-hover bg-background shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-5 py-4">
          <Image src="/brand/drx-wordmark.svg" alt="DRX" width={80} height={34} className="h-8 w-auto" />
          <span className="text-xs text-muted-foreground">Northstar Demo Shop</span>
        </div>
        <div className="space-y-5 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-background"><ShoppingCart className="size-5" aria-hidden="true" /></span>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">{drxContent.navigation.newSale}</h2>
              <p className="text-sm text-muted-foreground">Products and your basket, together.</p>
            </div>
          </div>
          <div className="rounded-[14px] border border-border bg-surface p-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">{drxContent.navigation.products}</p>
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-accent"><Package className="size-5" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Sample product</p>
                <p className="mt-1 text-xs text-muted-foreground">ALP-101 · Stock: 18</p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-foreground">$12.00</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-[14px] border border-border bg-surface">
            <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">Basket</div>
            <dl className="space-y-4 p-4 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Sample product × 2</dt><dd className="font-medium tabular-nums text-foreground">$24.00</dd></div>
              <div className="flex justify-between gap-3 border-t border-border pt-4"><dt className="text-muted-foreground">Subtotal</dt><dd className="font-display text-2xl font-bold tabular-nums text-foreground">$24.00</dd></div>
            </dl>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">Review the total, choose the customer, and record how they paid.</p>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs leading-5 text-muted-foreground">Illustrative screen with fictional data.</figcaption>
    </figure>
  );
}
