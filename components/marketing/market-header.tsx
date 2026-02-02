"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Rotating Status Chip Component
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
    // Check if we are on the home page
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
        <div className="relative w-[60px] h-8">
          <Image
            src="/brand/drx-mark-primary.png"
            alt="DeelRx"
            fill
            className="object-contain"
          />
        </div>
        <span className="font-bold text-xl tracking-tight">DeelRx</span>
      </Link>

      {/* Desktop Nav */}
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
          href="/login"
          className="text-sm font-bold tracking-widest hover:text-accent transition-all hover:drop-shadow-[0_0_8px_rgba(191,255,0,0.8)]"
        >
          LOGIN
        </Link>
      </nav>

      <div className="flex items-center gap-4">
        <div className="hidden md:block">
          <StatusChip />
        </div>
        <Link href="/login">
          <Button
            size="sm"
            className="bg-foreground text-background hover:bg-foreground/90 font-semibold rounded-full px-6"
          >
            START
          </Button>
        </Link>
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
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
              href="/login"
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
