export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8">Contact Us</h1>
        <div className="text-foreground space-y-8">
          <section>
            <p className="text-lg text-muted-foreground">
              Have questions about Deelrx CRM? We're here to help. Get in touch with our support team using any of the methods below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
            <div className="bg-muted p-6 rounded-lg space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Phone</h3>
                <p className="text-base">
                  <a href="tel:+14048830885" className="text-blue-600 hover:text-blue-800 transition-colors">
                    +1 (404) 883-0885
                  </a>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Monday - Friday, 9 AM - 5 PM EST
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Email</h3>
                <p className="text-base">
                  <a href="mailto:support@deelrx.com" className="text-blue-600 hover:text-blue-800 transition-colors">
                    support@deelrx.com
                  </a>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  We typically respond within 24 business hours
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Privacy Inquiries</h3>
                <p className="text-base">
                  <a href="mailto:privacy@deelrx.com" className="text-blue-600 hover:text-blue-800 transition-colors">
                    privacy@deelrx.com
                  </a>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  For privacy and data-related questions
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Support Resources</h2>
            <ul className="space-y-3">
              <li>
                <a href="/help" className="text-blue-600 hover:text-blue-800 transition-colors font-medium">
                  Help Center
                </a>
                <p className="text-sm text-muted-foreground mt-1">
                  Browse our comprehensive guides and documentation
                </p>
              </li>
              <li>
                <a href="/privacy" className="text-blue-600 hover:text-blue-800 transition-colors font-medium">
                  Privacy Policy
                </a>
                <p className="text-sm text-muted-foreground mt-1">
                  Learn how we protect your data
                </p>
              </li>
              <li>
                <a href="/terms" className="text-blue-600 hover:text-blue-800 transition-colors font-medium">
                  Terms of Service
                </a>
                <p className="text-sm text-muted-foreground mt-1">
                  Review our terms and conditions
                </p>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Connect With Us</h2>
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Follow DeelRx on social media to stay updated with the latest features and announcements:
              </p>
              <div className="flex gap-4">
                <a href="https://twitter.com/deelrx" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors font-medium">
                  Twitter
                </a>
                <a href="https://linkedin.com/company/deelrx" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors font-medium">
                  LinkedIn
                </a>
                <a href="https://github.com/deelrx" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors font-medium">
                  GitHub
                </a>
              </div>
            </div>
          </section>

          <section>
            <p className="text-sm text-muted-foreground text-center mt-12 pt-8 border-t border-border">
              © {new Date().getFullYear()} DeelRx Corporation. All rights reserved.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
