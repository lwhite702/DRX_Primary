import { IphoneRender } from "./device-renders";

export function MarketingProductProof() {
  return (
    <div
      className="relative flex items-center justify-center pt-2 pb-4 group"
      aria-label="DRX live application preview on iPhone"
    >
      {/* Ambient lime green glow behind phone renders */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-accent/20 blur-[48px] rounded-full scale-95 pointer-events-none opacity-60 group-hover:opacity-85 transition-opacity duration-700"
      />

      <div className="relative flex items-center justify-center gap-4 sm:gap-6 lg:gap-7 animate-subtle-float">
        {/* Phone 1: Operator Home screen */}
        <div className="hidden sm:block w-[210px] md:w-[200px] lg:w-[230px] shrink-0 transition-transform duration-500 hover:scale-[1.02] hover:-translate-y-1">
          <IphoneRender
            src="/screenshots/iphone-dashboard.png"
            alt="DRX Operator Home screen on iPhone"
            priority
            badge={{ label: "Synced", active: true }}
          />
        </div>

        {/* Phone 2: Live POS Sale & Checkout */}
        <div className="w-[230px] sm:w-[230px] md:w-[210px] lg:w-[245px] shrink-0 transition-transform duration-500 hover:scale-[1.02] hover:-translate-y-1">
          <IphoneRender
            src="/screenshots/iphone-pos-sale.png"
            alt="DRX POS Checkout and Quick Sale on iPhone"
            priority
            badge={{ label: "Live POS", active: true }}
          />
        </div>
      </div>
    </div>
  );
}
