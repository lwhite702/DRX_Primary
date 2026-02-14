import { Lock, EyeOff, ShieldCheck, FileKey } from "lucide-react";

export function Security() {
  return (
    <section className="py-32 px-6 bg-[#050505] relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#BFFF00] opacity-[0.03] blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-white uppercase">
            Security Isn't A Feature
          </h2>
          <p className="text-[#BFFF00] mt-4 font-mono text-sm tracking-widest uppercase">
            It's the whole point.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#0A0A0A] border-l-2 border-[#BFFF00] p-6">
            <div className="flex items-center gap-3 mb-3">
              <Lock className="w-5 h-5 text-[#BFFF00]" />
              <h3 className="font-bold text-white uppercase text-sm">
                End-to-End Encryption
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Transport encryption and controlled data access are part of the
              current platform safeguards.
            </p>
          </div>

          <div className="bg-[#0A0A0A] border-l-2 border-[#BFFF00] p-6">
            <div className="flex items-center gap-3 mb-3">
              <EyeOff className="w-5 h-5 text-[#BFFF00]" />
              <h3 className="font-bold text-white uppercase text-sm">
                Visual Obfuscation
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              "Privacy Mode" masks sensitive values instantly when others are
              nearby.
            </p>
          </div>

          <div className="bg-[#0A0A0A] border-l-2 border-[#BFFF00] p-6">
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck className="w-5 h-5 text-[#BFFF00]" />
              <h3 className="font-bold text-white uppercase text-sm">
                Role-Based Access
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Granular permissions for operators. You control who sees what.
            </p>
          </div>

          <div className="bg-[#0A0A0A] border-l-2 border-[#BFFF00] p-6">
            <div className="flex items-center gap-3 mb-3">
              <FileKey className="w-5 h-5 text-[#BFFF00]" />
              <h3 className="font-bold text-white uppercase text-sm">
                Audit Logs
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Every action is logged. Complete accountability for your team.
            </p>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="mt-20 border-y border-white/10 py-8 flex flex-wrap justify-center gap-12 text-center">
          <div>
            <p className="text-3xl font-bold text-white font-mono">256</p>
            <p className="text-[10px] uppercase tracking-widest text-[#BFFF00] mt-1">
              Bit Encryption
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white font-mono">0</p>
            <p className="text-[10px] uppercase tracking-widest text-[#BFFF00] mt-1">
              Data Leaks
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white font-mono">100%</p>
            <p className="text-[10px] uppercase tracking-widest text-[#BFFF00] mt-1">
              Role Scoped Access
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
