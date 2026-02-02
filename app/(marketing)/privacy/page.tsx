"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="bg-background min-h-screen text-foreground font-sans">
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-24">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-xs font-mono tracking-widest text-muted-foreground">
          <Link href="/" className="hover:text-accent transition-colors">
            HOME
          </Link>
          <span>/</span>
          <span className="text-foreground">PRIVACY POLICY</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-8">
          Privacy Policy
        </h1>

        <div className="text-foreground space-y-6 text-base leading-relaxed">
          <p className="text-muted-foreground">
            Last Updated: January 27, 2025
          </p>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">1. Introduction</h2>
            <p>
              DeelRx CRM ("Company," "we," "us," or "our") operates the DRX CRM
              platform ("Service"). This Privacy Policy explains how we collect,
              use, disclose, and otherwise process personal information in
              connection with our Service.
            </p>
            <p>
              We are committed to protecting your privacy and ensuring you have
              a positive experience on our platform. This policy applies to all
              users of DRX CRM, including business owners, employees, and
              customers whose data is processed through the system.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              2. Information We Collect
            </h2>
            <h3 className="text-xl font-semibold mt-4 mb-2">
              2.1 Information You Provide
            </h3>
            <ul className="list-disc list-inside space-y-2">
              <li>Account credentials (email, password)</li>
              <li>
                Business profile information (business name, address, phone,
                email)
              </li>
              <li>
                Customer information (names, phone numbers, email addresses,
                physical addresses)
              </li>
              <li>
                Inventory information (product names, SKUs, pricing, supplier
                details)
              </li>
              <li>Transaction data (sales, credits, payments, notes)</li>
              <li>User preferences and settings</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              2.2 Information Collected Automatically
            </h3>
            <ul className="list-disc list-inside space-y-2">
              <li>Log data (IP address, browser type, pages visited)</li>
              <li>Device information (operating system, device type)</li>
              <li>Usage analytics (features used, interaction patterns)</li>
              <li>Session information (login times, duration)</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              2.3 Information from Third Parties
            </h3>
            <p>
              We may receive information from payment processors and service
              providers who assist us in providing the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Providing and improving the DRX CRM platform</li>
              <li>Processing transactions and managing accounts</li>
              <li>Communicating with you about service updates and changes</li>
              <li>Responding to support requests</li>
              <li>Conducting security and fraud prevention</li>
              <li>Complying with legal obligations</li>
              <li>Analytics and understanding usage patterns</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">4. Data Protection</h2>
            <p>
              We implement appropriate technical and organizational measures to
              protect your personal information against unauthorized access,
              alteration, disclosure, or destruction. This includes:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Encryption in transit using TLS/SSL</li>
              <li>Secure authentication mechanisms</li>
              <li>Row-level security in our database</li>
              <li>Regular security audits</li>
              <li>Access controls and permission systems</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">5. Data Retention</h2>
            <p>
              We retain personal information for as long as necessary to provide
              the Service and fulfill the purposes outlined in this Privacy
              Policy. Specifically:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Account data: Retained while account is active</li>
              <li>
                Business transaction records: Retained for 7 years (tax/legal
                compliance)
              </li>
              <li>
                Customer records: Retained as long as business account is active
              </li>
              <li>
                Deleted account data: Purged within 30 days of account deletion
                (unless legally required)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              6. Your Privacy Rights
            </h2>
            <p>
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>Right to Access:</strong> Request a copy of your
                personal information
              </li>
              <li>
                <strong>Right to Rectification:</strong> Correct inaccurate
                information
              </li>
              <li>
                <strong>Right to Erasure:</strong> Request deletion of your data
              </li>
              <li>
                <strong>Right to Data Portability:</strong> Receive data in
                structured format
              </li>
              <li>
                <strong>Right to Restrict Processing:</strong> Limit how we use
                your data
              </li>
              <li>
                <strong>Right to Object:</strong> Opt-out of certain processing
              </li>
            </ul>
            <p className="mt-4">
              To exercise these rights, contact us at privacy@deelrx.com with
              your request details.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              7. Information Sharing
            </h2>
            <p>
              We do not sell your personal information. We may share information
              with:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Service providers (payment processors, hosting providers)</li>
              <li>
                Business associates as necessary for providing the Service
              </li>
              <li>Legal authorities when required by law</li>
              <li>
                Other users within your business (with appropriate access
                controls)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              8. International Data Transfers
            </h2>
            <p>
              Your information may be transferred to, stored in, and processed
              in countries other than your country of residence. These countries
              may have data protection laws that differ from your home country.
              By using DRX CRM, you consent to the transfer of your information
              to countries outside your country of residence.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              9. Children's Privacy
            </h2>
            <p>
              DRX CRM is not directed to children under the age of 13. We do not
              knowingly collect personal information from children under 13. If
              we learn we have collected personal information from a child under
              13, we will delete such information promptly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              10. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of material changes by posting the updated policy and
              updating the "Last Updated" date. Your continued use of the
              Service constitutes acceptance of the updated Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">11. Contact Us</h2>
            <p>
              If you have questions, concerns, or requests regarding this
              Privacy Policy or our privacy practices, please contact us:
            </p>
            <div className="mt-4 space-y-2">
              <p>
                <strong>Email:</strong> privacy@deelrx.com
              </p>
              <p>
                <strong>Mailing Address:</strong>
              </p>
              <p className="ml-4">
                DeelRx Corporation
                <br />
                Privacy Team
                <br />
                United States
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              12. Your California Privacy Rights
            </h2>
            <p>
              California residents have specific rights under the California
              Consumer Privacy Act (CCPA). We will respond to verified requests
              within 45 days. You have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Know what personal information is collected</li>
              <li>Know whether personal information is sold</li>
              <li>Delete personal information</li>
              <li>Opt-out of the sale or sharing of personal information</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
