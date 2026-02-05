import { SignIn } from "@clerk/nextjs";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
  ShieldCheck,
  Clock,
  Database,
  Smartphone,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Login | Deelrx CRM",
  description: "Access your secure workspace.",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans text-gray-400">
      {/* Background Noise/Grid */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:30px_30px] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay" />

      {/* Main Container */}
      <div className="w-full max-w-[480px] space-y-8 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col items-center space-y-6">
          <div className="relative h-12 w-[160px]">
            <Image
              src="/brand/DRX Wordmark Color.svg"
              alt="Deelrx CRM"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="text-center space-y-1">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
              Deelrx CRM Operator Console
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white uppercase">
              Sign In
            </h1>
            <p className="text-xs text-muted-foreground">
              Enter your credentials to access the operator console. All
              sessions are logged and monitored.
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-1 shadow-2xl overflow-hidden">
          {/* System Status Badge */}
          <div className="px-6 pt-6 pb-2 flex justify-between items-center">
            <div className="inline-flex items-center gap-2 px-2 py-1 bg-primary/10 border border-primary/20 rounded text-[10px] text-primary uppercase font-mono tracking-wider">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              System Online
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" />
              Encrypted
            </div>
          </div>

          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                cardBox:
                  "w-full shadow-none border-none bg-transparent backdrop-blur-none p-6 pt-2 pb-8",
                card: "bg-transparent shadow-none border-none p-0",
                header: "hidden",
                formButtonPrimary:
                  "bg-primary text-black hover:bg-primary/90 h-11 rounded-md font-bold tracking-wide uppercase transition-all shadow-[0_0_20px_rgba(191,255,0,0.1)] hover:shadow-[0_0_30px_rgba(191,255,0,0.2)]",
                socialButtonsBlockButton:
                  "bg-white/5 border border-white/10 text-white hover:bg-white/10 h-10 rounded-md transition-colors",
                dividerLine: "bg-white/5",
                dividerText:
                  "text-muted-foreground text-[10px] uppercase tracking-widest font-mono",
                formFieldLabel:
                  "text-muted-foreground text-[10px] uppercase tracking-wider font-mono mb-1.5",
                formFieldInput:
                  "bg-black/50 border-white/10 text-white rounded-md focus:ring-primary/50 focus:border-primary/50 h-10 font-mono text-sm placeholder:text-white/20",
                footerActionLink:
                  "text-primary hover:text-primary/90 font-mono text-xs",
                footer: "hidden",
              },
              layout: {
                socialButtonsPlacement: "bottom",
                showOptionalFields: false,
              },
            }}
            fallbackRedirectUrl="/dashboard"
          />
        </div>

        <div className="text-center text-xs font-mono text-muted-foreground">
          Don&apos;t have an account?{" "}
          <span className="text-primary cursor-pointer hover:underline">
            Request Access from Administrator
          </span>
        </div>

        {/* Security Info Card */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-6 space-y-6">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Session Security
          </div>

          <div className="space-y-4">
            {/* Item 1 */}
            <div className="flex items-start gap-4 group">
              <div className="mt-0.5 p-1.5 rounded bg-white/5 text-muted-foreground group-hover:text-primary transition-colors">
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-medium text-white">Auto-Wipe</h3>
                  <span className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-primary font-mono">
                    ACTIVE
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Local cache cleared on exit
                </p>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex items-start gap-4 group">
              <div className="mt-0.5 p-1.5 rounded bg-white/5 text-muted-foreground group-hover:text-primary transition-colors">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-medium text-white">Encryption</h3>
                  <span className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-accent font-mono uppercase">
                    AES-256
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  End-to-end zero knowledge
                </p>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex items-start gap-4 group">
              <div className="mt-0.5 p-1.5 rounded bg-white/5 text-muted-foreground group-hover:text-primary transition-colors">
                <Database className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-medium text-white">
                    No-Log Policy
                  </h3>
                  <span className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-primary font-mono">
                    ENFORCED
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  No server-side activity tracking
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trusted Device */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="space-y-4 flex-1">
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-white">
                  Trusted Device Recognition
                </h3>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  This device is not recognized. You may be asked to verify your
                  identity.
                </p>
              </div>

              {/* Device Stats */}
              <div className="bg-black/40 rounded border border-white/5 p-3 space-y-2 font-mono text-[10px]">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">CURRENT DEVICE</span>
                  <span className="text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                    UNRECOGNIZED
                  </span>
                </div>
                <div className="h-px bg-white/5 my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Browser</span>
                  <span className="text-white">Chrome 120.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">OS</span>
                  <span className="text-white">macOS 14.2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="text-white">San Francisco, CA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IP Address</span>
                  <span className="text-white">192.168.1.42</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Build Info */}
        <div className="pt-8 pb-4 text-center space-y-4">
          <div className="flex justify-center gap-4 text-[10px] text-muted-foreground/60 font-mono">
            <Link href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="#" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <Link href="#" className="hover:text-white transition-colors">
              Security
            </Link>
          </div>

          <div className="text-[9px] text-muted-foreground/40 font-mono uppercase tracking-widest">
            © 2026 Deelrx CRM
          </div>

          <div className="flex justify-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded border border-white/5">
              <div className="w-1 h-1 bg-primary rounded-full" />
              <span className="text-[9px] font-mono text-primary font-bold">
                UPTIME 99.99%
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded border border-white/5">
              <div className="w-1 h-1 bg-white/50 rounded-full" />
              <span className="text-[9px] font-mono text-white/50">
                AES-256
              </span>
            </div>
          </div>

          <div className="text-[8px] text-muted-foreground/30 font-mono uppercase">
            DRX OPERATOR CONSOLE v2.4.1 <br />
            BUILD 20260131.0722
          </div>
        </div>
      </div>
    </div>
  );
}
