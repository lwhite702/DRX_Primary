import { OperatorLoginForm } from "@/components/auth/operator-login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {/* Background Grid - subtle */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative z-10 w-full mb-8 text-center space-y-2">
        <div className="mx-auto bg-[#D9F99D] w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(217,249,157,0.3)]">
          <span className="font-bold text-black text-xl tracking-tighter">
            DRX
          </span>
        </div>
        <h1 className="text-[10px] font-bold tracking-[0.2em] text-[#4ADE80] uppercase">
          DeclRx Operator Console
        </h1>
        <h2 className="text-3xl font-light text-white tracking-widest">
          SIGN IN
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Enter your credentials to access the operator console. All sessions
          are logged and monitored.
        </p>
      </div>

      <div className="relative z-10 w-full">
        <OperatorLoginForm />
      </div>

      <div className="absolute bottom-6 flex gap-3">
        <span className="text-[10px] font-mono font-bold text-[#D9F99D] bg-[#D9F99D]/10 border border-[#D9F99D]/20 px-2 py-0.5 rounded">
          ● UPTIME 99.99%
        </span>
        <span className="text-[10px] font-mono font-bold text-muted-foreground border border-white/10 px-2 py-0.5 rounded flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-white rounded-full"></span> AES-256
        </span>
      </div>
    </div>
  );
}
