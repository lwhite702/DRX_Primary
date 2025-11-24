export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8">Accessibility Statement</h1>
        <div className="text-foreground space-y-6 text-base leading-relaxed">
          <p className="text-muted-foreground">Last Updated: January 27, 2025</p>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">Our Commitment to Accessibility</h2>
            <p>
              DeelRx is committed to ensuring that DRX CRM is accessible to people with disabilities. We are continually improving the user experience for everyone and applying relevant accessibility standards.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">Standards and Guidelines</h2>
            <p>
              DRX CRM aims to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards developed by the W3C Web Accessibility Initiative. These guidelines explain how to make web content accessible to people with a wide range of disabilities.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">Accessibility Features</h2>
            <p>DRX CRM includes the following accessibility features:</p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li>Keyboard navigation throughout the application</li>
              <li>Focus indicators visible on all interactive elements</li>
              <li>Semantic HTML structure for screen reader compatibility</li>
              <li>ARIA labels and descriptions for form controls</li>
              <li>Skip-to-content link on all pages</li>
              <li>Sufficient color contrast ratios (WCAG AA compliant)</li>
              <li>Resizable text without loss of functionality</li>
              <li>Support for browser zoom capabilities</li>
              <li>Error messages clearly identified and suggested corrections provided</li>
              <li>Form labels associated with input fields</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">Keyboard Navigation</h2>
            <p>
              You can navigate the entire DRX CRM interface using only the keyboard:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li><strong>Tab:</strong> Move focus to the next interactive element</li>
              <li><strong>Shift + Tab:</strong> Move focus to the previous interactive element</li>
              <li><strong>Enter:</strong> Activate buttons and links</li>
              <li><strong>Space:</strong> Activate buttons and checkboxes</li>
              <li><strong>Arrow Keys:</strong> Navigate within dropdown menus and lists</li>
              <li><strong>Escape:</strong> Close dialogs and menus</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">Screen Reader Support</h2>
            <p>
              DRX CRM has been designed to work with common screen readers including:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li>NVDA (NonVisual Desktop Access)</li>
              <li>JAWS (Job Access With Speech)</li>
              <li>VoiceOver (macOS and iOS)</li>
              <li>Narrator (Windows)</li>
              <li>TalkBack (Android)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">Mobile Accessibility</h2>
            <p>
              DRX CRM is designed to be accessible on mobile devices. Touch targets are sized to meet minimum requirements, and the interface responds to standard mobile accessibility features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">Known Issues</h2>
            <p>
              We are aware of the following accessibility limitations and are actively working to address them:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li>Some complex data tables may require additional structure for optimal screen reader navigation</li>
              <li>Real-time data updates in certain views may not always be announced to screen readers</li>
              <li>Some form validation messages could be more descriptive</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">Accessibility Settings</h2>
            <p>
              DRX CRM respects your system accessibility settings:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li>Reduced motion preferences are honored</li>
              <li>Text scaling is supported</li>
              <li>High contrast modes are compatible with the interface</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">Browser Extensions</h2>
            <p>
              DRX CRM supports commonly used accessibility browser extensions such as:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li>axe DevTools</li>
              <li>WebAIM</li>
              <li>WAVE</li>
              <li>Accessibility Insights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">Reporting Accessibility Issues</h2>
            <p>
              If you encounter any accessibility barriers while using DRX CRM, please report them to us. We take accessibility seriously and will work to resolve issues promptly.
            </p>
            <div className="mt-4 space-y-2">
              <p><strong>Email:</strong> accessibility@deelrx.com</p>
              <p><strong>Include in your report:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Description of the accessibility issue</li>
                <li>The page or feature where you encountered the issue</li>
                <li>Your assistive technology (if applicable)</li>
                <li>Steps to reproduce the issue</li>
                <li>Your contact information</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">Continuous Improvement</h2>
            <p>
              We are committed to continuously improving the accessibility of DRX CRM. We regularly:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li>Conduct accessibility audits and testing</li>
              <li>Update features based on user feedback</li>
              <li>Stay informed about accessibility best practices</li>
              <li>Test with real assistive technologies</li>
              <li>Train our team on accessibility standards</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">Additional Resources</h2>
            <p>
              For more information about web accessibility, visit:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li>
                <a href="https://www.w3.org/WAI/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  W3C Web Accessibility Initiative
                </a>
              </li>
              <li>
                <a href="https://www.w3.org/WAI/WCAG21/quickref/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  WCAG 2.1 Quick Reference
                </a>
              </li>
              <li>
                <a href="https://webaim.org/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  WebAIM - Web Accessibility In Mind
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">Contact</h2>
            <p>
              If you have accessibility questions or suggestions, please contact us:
            </p>
            <div className="mt-4 space-y-2">
              <p><strong>Email:</strong> accessibility@deelrx.com</p>
              <p><strong>Response Time:</strong> We aim to respond to accessibility inquiries within 48 hours</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
