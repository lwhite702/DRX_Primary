export default function HelpPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">Help Center</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Need assistance? Our knowledge base is currently being updated.
      </p>
      <a href="/dashboard" className="text-primary hover:underline font-medium">
        Return to Dashboard
      </a>
    </div>
  );
}
