"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { Button } from "@deelrx/ui";

const APP_URL = "https://deelrxcrm.app";

function StatusChip() {
  const statuses = [
    "PRIVACY CONTROLS: ON",
    "AUDIT LOGGING: ON",
    "OFFLINE MODE: AVAILABLE",
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % statuses.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="technical-label flex items-center gap-2 border border-border/50 px-3 py-1.5 rounded-full bg-background/50 backdrop-blur-md transition-all duration-500 min-w-[200px] justify-center text-xs">
      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
      <span className="fade-in-out key={index}">{statuses[index]}</span>
    </div>
  );
}

export function MarketHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    if (window.location.pathname !== "/") {
      window.location.href = `/#${id}`;
      return;
    }

    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="px-6 py-4 flex justify-between items-center border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
      <Link href="/" className="flex items-center gap-2">
        <div className="relative w-[120px] h-8">
          <Image
            src="/brand/DRX Wordmark Color.svg"
            alt="DeelRx"
            fill
            className="object-contain"
          />
        </div>
      </Link>

      <nav className="hidden md:flex items-center gap-8">
        {["WHY", "FEATURES", "WHO", "PROOF"].map((item) => (
          <button
            key={item}
            onClick={() => scrollToSection(item.toLowerCase())}
            className="text-sm font-bold tracking-widest hover:text-accent transition-all hover:drop-shadow-[0_0_8px_rgba(191,255,0,0.8)]"
          >
            {item}
          </button>
        ))}
        <Link
          href={APP_URL}
          className="text-sm font-bold tracking-widest hover:text-accent transition-all hover:drop-shadow-[0_0_8px_rgba(191,255,0,0.8)]"
        >
          LOGIN
        </Link>
      </nav>

      <div className="flex items-center gap-4">
        <div className="hidden md:block">
          <StatusChip />
        </div>
        <Button
          asChild
          size="sm"
          className="bg-foreground text-background hover:bg-foreground/90 font-semibold rounded-full px-6"
        >
          <Link href={APP_URL}>START</Link>
        </Button>
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-sm pt-24 px-6 md:hidden">
          <nav className="flex flex-col gap-6 text-center">
            {["WHY", "FEATURES", "WHO", "PROOF"].map((item) => (
              <button
                key={item}
                onClick={() => scrollToSection(item.toLowerCase())}
                className="text-2xl font-bold tracking-tight hover:text-accent"
              >
                {item}
              </button>
            ))}
            <Link
              href={APP_URL}
              className="text-2xl font-bold tracking-tight hover:text-accent"
            >
              LOGIN
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
