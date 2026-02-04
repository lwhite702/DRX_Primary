import { Building2 } from "lucide-react";

export function WelcomeStep() {
  return (
    <div className="space-y-6 text-center py-10">
      <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto text-accent mb-6">
        <Building2 className="w-10 h-10" />
      </div>
      <h2 className="text-3xl font-bold">Welcome to DRX.</h2>
      <p className="text-muted-foreground text-lg max-w-md mx-auto">
        Let's get your shop running. This setup takes about 2 minutes and helps
        us configure your privacy, inventory, and checkout settings.
      </p>
    </div>
  );
}
