export default function FeaturesPage() {
  // For now, redirect to dashboard as a fallback or show a "Coming Soon" message
  // Given the feedback, we just want to avoid 404s
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">Features</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Detailed feature overview is coming soon.
      </p>
      <a href="/dashboard" className="text-primary hover:underline font-medium">
        Return to Dashboard
      </a>
    </div>
  );
}
