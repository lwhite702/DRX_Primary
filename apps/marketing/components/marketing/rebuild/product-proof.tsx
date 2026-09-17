import {
  ArrowLeft,
  Barcode,
  Building2,
  ChevronRight,
  EyeOff,
  Home,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Users,
} from "lucide-react";

export function MarketingProductProof() {
  return (
    <div
      className="flex items-center justify-center gap-6 py-4"
      aria-label="DRX live application preview"
    >
      {/* Phone 1: Approved Home · Source 12:8 */}
      <div className="flex flex-col h-[506px] w-[234px] sm:h-[506px] sm:w-[234px] md:h-[438px] md:w-[202px] lg:h-[506px] lg:w-[234px] shrink-0 overflow-hidden rounded-[20px] border border-[#a3a3a3] bg-[#0a0a0a] shadow-2xl select-none">
        {/* App Header */}
        <div className="flex flex-col gap-1 border-b border-white/10 bg-[#0a0a0a] px-3 py-1.5 shrink-0">
          <div className="flex items-center justify-between">
            <span className="font-display font-extrabold text-[12px] text-[#f5f5f5]">
              DRX
            </span>
            <div className="flex items-center gap-1 rounded bg-white/[0.04] px-1.5 py-0.5">
              <EyeOff className="size-3 text-[#a3a3a3]" />
              <span className="text-[7.5px] font-medium text-[#a3a3a3]">
                Values hidden
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="flex-1 font-display font-bold text-[10px] text-[#f5f5f5] truncate">
              Riverside Market
            </span>
            <div className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-[#10b981]" />
              <span className="text-[7.5px] font-medium text-[#a3a3a3]">
                Synced
              </span>
            </div>
            <ChevronRight className="size-3 text-[#a3a3a3]" />
          </div>
        </div>

        {/* Home Content */}
        <div className="flex flex-1 flex-col gap-2 overflow-hidden px-3 py-2 text-left">
          {/* Greeting */}
          <div>
            <p className="font-display font-extrabold text-[14px] text-[#f5f5f5] leading-tight">
              Good morning
            </p>
            <p className="text-[8px] text-[#a3a3a3]">
              Here’s what needs you today.
            </p>
          </div>

          {/* Offline Ready Note */}
          <div className="flex items-center gap-1.5 rounded bg-[#1a1a1a] px-2 py-1">
            <span className="size-1.5 rounded-full bg-[#10b981]" />
            <span className="text-[7.5px] font-medium text-[#a3a3a3]">
              Offline-ready · changes sync automatically
            </span>
          </div>

          {/* Private Metrics */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex flex-col gap-0.5 rounded-[12px] border border-white/10 bg-[#121212] p-2">
              <span className="text-[8px] font-medium text-[#a3a3a3]">
                Today’s sales
              </span>
              <span className="font-display font-extrabold text-[16px] text-[#f5f5f5] tracking-widest leading-tight">
                ••••
              </span>
              <span className="text-[7px] text-[#a3a3a3]">Values hidden</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-[12px] border border-white/10 bg-[#121212] p-2">
              <span className="text-[8px] font-medium text-[#a3a3a3]">
                Still owed
              </span>
              <span className="font-display font-extrabold text-[16px] text-[#f5f5f5] tracking-widest leading-tight">
                ••••
              </span>
              <span className="text-[7px] text-[#a3a3a3]">Tap eye to reveal</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-1">
            <span className="font-display font-bold text-[10px] text-[#f5f5f5]">
              Quick actions
            </span>
            <div className="grid grid-cols-3 gap-1">
              <div className="flex flex-col gap-0.5 rounded-lg bg-[#ccff00] p-1.5 text-[#0a0a0a]">
                <ShoppingCart className="size-3" />
                <span className="text-[7.5px] font-bold leading-tight">
                  Start a sale
                </span>
                <span className="text-[6.5px] opacity-80 leading-tight">
                  Fast checkout
                </span>
              </div>
              <div className="flex flex-col gap-0.5 rounded-lg border border-white/10 bg-[#121212] p-1.5 text-[#f5f5f5]">
                <Package className="size-3 text-[#a3a3a3]" />
                <span className="text-[7.5px] font-medium leading-tight">
                  Add stock
                </span>
                <span className="text-[6.5px] text-[#a3a3a3] leading-tight">
                  Update count
                </span>
              </div>
              <div className="flex flex-col gap-0.5 rounded-lg border border-white/10 bg-[#121212] p-1.5 text-[#f5f5f5]">
                <Users className="size-3 text-[#a3a3a3]" />
                <span className="text-[7.5px] font-medium leading-tight">
                  Record pay
                </span>
                <span className="text-[6.5px] text-[#a3a3a3] leading-tight">
                  Settle credit
                </span>
              </div>
            </div>
          </div>

          {/* Handle this */}
          <div className="flex flex-col gap-1">
            <span className="font-display font-bold text-[10px] text-[#f5f5f5]">
              Handle this
            </span>
            <div className="flex flex-col divide-y divide-white/5 rounded-lg border border-white/10 bg-[#121212]">
              <div className="flex items-center gap-1.5 px-2 py-1">
                <span className="size-1.5 rounded-full bg-[#f59e0b]" />
                <div className="flex flex-col">
                  <span className="text-[7.5px] font-medium text-[#f5f5f5]">
                    3 low-stock items
                  </span>
                  <span className="text-[6.5px] text-[#a3a3a3]">
                    Restock before your next rush
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1">
                <span className="size-1.5 rounded-full bg-[#f59e0b]" />
                <div className="flex flex-col">
                  <span className="text-[7.5px] font-medium text-[#f5f5f5]">
                    2 payments overdue
                  </span>
                  <span className="text-[6.5px] text-[#a3a3a3]">
                    Send a private reminder
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#121212] px-2 py-1">
            <span className="size-1.5 rounded-full bg-[#10b981]" />
            <div className="flex flex-col">
              <span className="text-[7.5px] font-medium text-[#f5f5f5]">
                Sale saved
              </span>
              <span className="text-[6.5px] text-[#a3a3a3]">
                $84.00 · 4 minutes ago
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#121212] px-2 py-1 shrink-0">
          <div className="flex flex-col items-center rounded px-1.5 py-0.5 text-[#ccff00]">
            <Home className="size-3" />
            <span className="text-[6.5px] font-medium">Home</span>
          </div>
          <div className="flex flex-col items-center px-1 text-[#a3a3a3]">
            <div className="flex size-5 items-center justify-center rounded-full bg-[#ccff00] text-[#0a0a0a]">
              <ShoppingCart className="size-3" />
            </div>
            <span className="text-[6.5px] font-medium">Sell</span>
          </div>
          <div className="flex flex-col items-center px-1 text-[#a3a3a3]">
            <Users className="size-3" />
            <span className="text-[6.5px] font-medium">Customers</span>
          </div>
          <div className="flex flex-col items-center px-1 text-[#a3a3a3]">
            <Package className="size-3" />
            <span className="text-[6.5px] font-medium">Inventory</span>
          </div>
          <div className="flex flex-col items-center px-1 text-[#a3a3a3]">
            <Building2 className="size-3" />
            <span className="text-[6.5px] font-medium">Business</span>
          </div>
        </div>
      </div>

      {/* Phone 2: Approved Sell Build · Source 19:556 (Hidden on mobile) */}
      <div className="hidden sm:flex flex-col h-[506px] w-[234px] md:h-[438px] md:w-[202px] lg:h-[506px] lg:w-[234px] shrink-0 overflow-hidden rounded-[20px] border border-[#a3a3a3] bg-[#0a0a0a] shadow-2xl select-none">
        {/* Flow Header */}
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-[#0a0a0a] px-2.5 py-2 shrink-0">
          <div className="flex size-6 items-center justify-center rounded-full bg-[#1a1a1a] text-[#f5f5f5]">
            <ArrowLeft className="size-3" />
          </div>
          <div className="flex flex-1 flex-col">
            <span className="font-display font-bold text-[10px] text-[#f5f5f5] leading-tight">
              Build sale
            </span>
            <span className="text-[7px] text-[#a3a3a3] leading-tight">
              Step 1 of 4
            </span>
          </div>
          <span className="rounded-full bg-[#1a1a1a] px-2 py-0.5 text-[7px] font-medium text-[#10b981]">
            Saved
          </span>
        </div>

        {/* Sell Content */}
        <div className="flex flex-1 flex-col gap-2 overflow-hidden px-3 py-2 text-left">
          {/* Search field */}
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#1a1a1a] px-2 py-1.5 text-[#a3a3a3]">
            <Search className="size-3" />
            <span className="text-[8.5px]">Search or scan a product</span>
          </div>

          {/* Scan barcode prompt */}
          <div className="flex items-center gap-1.5 rounded-lg bg-[#1a1a1a] px-2 py-1">
            <Barcode className="size-3.5 text-[#ccff00]" />
            <div className="flex flex-col">
              <span className="text-[7.5px] font-medium text-[#f5f5f5]">
                Scan a barcode
              </span>
              <span className="text-[6.5px] text-[#a3a3a3]">
                Camera works offline
              </span>
            </div>
          </div>

          {/* Categories */}
          <div className="flex items-center gap-1">
            <span className="rounded-full bg-[#ccff00] px-2 py-0.5 text-[7.5px] font-medium text-[#0a0a0a]">
              Popular
            </span>
            <span className="rounded-full bg-[#1a1a1a] px-2 py-0.5 text-[7.5px] font-medium text-[#f5f5f5]">
              Drinks
            </span>
            <span className="rounded-full bg-[#1a1a1a] px-2 py-0.5 text-[7.5px] font-medium text-[#f5f5f5]">
              Food
            </span>
          </div>

          {/* Popular Items List */}
          <div className="flex flex-col gap-1">
            <span className="font-display font-bold text-[10px] text-[#f5f5f5]">
              Popular items
            </span>
            <div className="flex flex-col gap-1">
              {[
                { name: "Mango Juice 500ml", stock: "3 in stock", price: "$12" },
                { name: "Brown Bread", stock: "Out after this sale", price: "$8" },
                { name: "Laundry Soap", stock: "18 in stock", price: "$16" },
                { name: "Ground Coffee", stock: "6 in stock", price: "$24" },
              ].map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-md border border-white/10 bg-[#121212] px-2 py-1"
                >
                  <div className="flex flex-col">
                    <span className="text-[8px] font-medium text-[#f5f5f5]">
                      {item.name}
                    </span>
                    <span className="text-[6.5px] text-[#a3a3a3]">
                      {item.stock}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-medium text-[#f5f5f5]">
                      {item.price}
                    </span>
                    <div className="flex size-5 items-center justify-center rounded-full bg-[#1a1a1a] text-[#ccff00] hover:bg-[#ccff00] hover:text-[#0a0a0a] transition-colors">
                      <Plus className="size-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart Note */}
          <div className="mt-auto flex items-center gap-1.5 rounded bg-[#1a1a1a] px-2 py-1">
            <span className="size-1.5 rounded-full bg-[#ccff00]" />
            <span className="text-[7px] font-medium text-[#a3a3a3]">
              3 items added · draft saved on this device
            </span>
          </div>
        </div>

        {/* Sticky Action Bar */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#121212] px-3 py-2 shrink-0">
          <div className="flex flex-col">
            <span className="text-[7.5px] text-[#a3a3a3]">Total</span>
            <span className="font-display font-bold text-[11px] text-[#f5f5f5]">
              $84.00 · 3 items
            </span>
          </div>
          <button
            type="button"
            className="rounded-[12px] bg-[#ccff00] px-3 py-1.5 text-[9.5px] font-bold text-[#0a0a0a] hover:opacity-95"
          >
            Review sale
          </button>
        </div>
      </div>
    </div>
  );
}
