"use client";

import { LogOut } from "lucide-react";
import { SignOutButton } from "@wrelik/auth/next";

export function LogoutButton({ className }: { className?: string }) {
  return (
    <SignOutButton redirectUrl="/login">
      <button
        className={
          className ?
            "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-foreground hover:bg-border transition-colors text-sm font-medium"
        }
      >
        <LogOut className="w-5 h-5" />
        Logout
      </button>
    </SignOutButton>
  );
}
