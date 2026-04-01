"use client";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/10 bg-[#070707] py-6 text-white/70">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <p>© {currentYear} Wrelik Brands LLC. All rights reserved.</p>
          <p className="text-xs text-white/50">
            Deelrx and DRX are trademarks of Wrelik Brands LLC.
          </p>
        </div>
      </div>
    </footer>
  );
}
