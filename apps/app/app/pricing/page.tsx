import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">Pricing</h1>
      <p className="text-xl text-muted-foreground mb-8">
        DRX is in early access. Final plans and prices are still being worked
        out.
      </p>
      <Link
        href="/waitlist"
        className="rounded-full bg-accent px-6 py-3 font-semibold text-black"
      >
        Join early access
      </Link>
    </div>
  );
}
