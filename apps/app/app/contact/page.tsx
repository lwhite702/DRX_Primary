export default function ContactPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Need help? Reach out to us at{" "}
        <a
          href="mailto:support@deelrx.com"
          className="text-primary hover:underline"
        >
          support@deelrx.com
        </a>
      </p>
      <a href="/dashboard" className="text-primary hover:underline font-medium">
        Return to Dashboard
      </a>
    </div>
  );
}
