"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, Eye, EyeOff, Smartphone } from "lucide-react";
import { SecurityBadges } from "./security-badges";

// Mock trusted device check
// const isTrustedDevice = false; // Toggle this to see unmatched state

export function OperatorLoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate login
    setTimeout(() => {
      setLoading(false);
      // Actual redirect handled by Clerk or NextAuth, this is UI only for now
      console.log("Authenticating...");
    }, 1500);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      {/* System Status Mock */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-[10px] font-bold text-[#4ADE80] tracking-wider uppercase border border-[#4ADE80]/20 bg-[#4ADE80]/10 px-1.5 py-0.5 rounded">
            System Online
          </span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5 opacity-60">
          <Lock className="w-3 h-3" /> ENCRYPTED
        </span>
      </div>

      <div className="bg-[#111] border border-white/5 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#4ADE80] to-transparent opacity-50" />

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider ml-1">
              Username or Email
            </label>
            <Input
              placeholder="operator@domain.com"
              className="bg-[#0A0A0A] border-white/10 h-11 text-sm focus-visible:ring-[#4ADE80]/50"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Password
              </label>
              <a
                href="#"
                className="text-[10px] font-bold text-[#D9F99D] hover:underline"
              >
                Forgot?
              </a>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                className="bg-[#0A0A0A] border-white/10 h-11 text-sm pr-10 focus-visible:ring-[#4ADE80]/50"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              className="border-white/20 data-[state=checked]:bg-[#4ADE80] data-[state=checked]:border-[#4ADE80] text-black"
            />
            <label
              htmlFor="remember"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
            >
              Remember this device for 30 days
            </label>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#D9F99D] text-black hover:bg-[#bef264] font-bold tracking-wide h-11"
            disabled={loading}
          >
            {loading ? "AUTHENTICATING..." : "AUTHENTICATE"}
          </Button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#111] px-2 text-muted-foreground font-bold tracking-wider text-[10px]">
                Or
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              type="button"
              className="w-full border-white/10 hover:bg-white/5 h-10 text-xs font-bold"
            >
              Sign in with Google
            </Button>
            <Button
              variant="outline"
              type="button"
              className="w-full border-white/10 hover:bg-white/5 h-10 text-xs font-bold"
            >
              Sign in with Microsoft
            </Button>
            <Button
              variant="outline"
              type="button"
              className="w-full border-white/10 hover:bg-white/5 h-10 text-xs font-bold"
            >
              Enterprise SSO
            </Button>
          </div>
        </form>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Don't have an account?
        </p>
        <a
          href="#"
          className="text-[#D9F99D] font-bold text-sm hover:underline tracking-wide"
        >
          Request Access from Administrator
        </a>
      </div>

      <div className="bg-[#111] border border-white/5 rounded-xl p-5 text-center text-xs text-muted-foreground">
        <p>
          All login attempts are logged and monitored. Unauthorized access
          attempts will be reported to system administrators and may result in
          account suspension or legal action.
        </p>
      </div>

      <SecurityBadges />

      <div className="bg-[#111] border border-white/5 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm mb-1">
              Trusted Device Recognition
            </h4>
            <p className="text-xs text-muted-foreground mb-4">
              This device is not recognized. You may be asked to verify your
              identity.
            </p>

            <div className="bg-black/40 rounded border border-white/5 p-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  Current Device
                </p>
                <p className="text-xs text-white">Chrome 120.0 • macOS 14.2</p>
              </div>
              <span className="text-[10px] font-bold text-yellow-500 border border-yellow-500/20 bg-yellow-500/10 px-1.5 py-0.5 rounded tracking-wider uppercase">
                Unrecognized
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center flex-wrap gap-4 text-[10px] text-muted-foreground font-bold tracking-wider uppercase">
        <a href="#" className="hover:text-white">
          Privacy Policy
        </a>
        <span>•</span>
        <a href="#" className="hover:text-white">
          Terms of Service
        </a>
        <span>•</span>
        <a href="#" className="hover:text-white">
          Security
        </a>
      </div>

      <div className="text-center text-[10px] font-mono text-muted-foreground opacity-50">
        © 2026 DECLRX ERM - ALL SESSIONS MONITORED
      </div>
    </div>
  );
}
