"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { joinWaitlist } from "@/app/actions/beta";
import { toast } from "sonner";
import { Loader2, ArrowRight, ShieldCheck, Zap, BarChart } from "lucide-react";

export default function LandingPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("email", email);

    const result = await joinWaitlist(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      setJoined(true);
      toast.success("Welcome to the waitlist!");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-4 flex justify-between items-center border-b border-border/40 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8">
            <Image
              src="/icon.svg"
              alt="DeelRx CRM"
              fill
              className="object-contain"
            />
          </div>
          <span className="font-bold text-xl">DRX</span>
          <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500/20">
            BETA
          </span>
        </div>
        <Link href="/login">
          <Button variant="ghost" size="sm">
            Login
          </Button>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
        <div className="max-w-3xl space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20">
              Coming Soon
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              The Future of <span className="text-primary">Medical Retail</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A privacy-first, compliance-ready CRM and Point of Sale system
              designed for the modern era.
            </p>
          </div>

          <Card className="max-w-md mx-auto bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="pt-6">
              {joined ? (
                <div className="py-8 text-center space-y-3 animate-in zoom-in duration-300">
                  <div className="bg-green-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-green-500">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold">You're on the list!</h3>
                  <p className="text-muted-foreground">
                    We'll notify you as soon as spots open up.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex flex-col space-y-2 text-left">
                    <label htmlFor="email" className="text-sm font-medium">
                      Join the Waitlist
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-background"
                      />
                      <Button type="submit" disabled={loading}>
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Join"
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Be the first to know when we launch public beta.
                    </p>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-semibold">Privacy First</h3>
              <p className="text-sm text-muted-foreground">
                Built from the ground up to protect customer data.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-semibold">Lightning Fast</h3>
              <p className="text-sm text-muted-foreground">
                Optimized POS interface for high-volume retail.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
                <BarChart className="w-6 h-6" />
              </div>
              <h3 className="font-semibold">Deep Insights</h3>
              <p className="text-sm text-muted-foreground">
                AI-driven analytics to grow your business.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border/40">
        <p>
          © {new Date().getFullYear()} Wrelik Brands LLC. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
