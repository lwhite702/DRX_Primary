export default function PricingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">Pricing</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Our pricing plans are being finalized. Please contact support for
        details.
      </p>
      <a href="/dashboard" className="text-primary hover:underline font-medium">
        Return to Dashboard
      </a>
    </div>
  );
}
