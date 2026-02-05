"use client";

import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="bg-background min-h-screen text-foreground font-sans">
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-24">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-xs font-mono tracking-widest text-muted-foreground">
          <Link href="/" className="hover:text-accent transition-colors">
            HOME
          </Link>
          <span>/</span>
          <span className="text-foreground">TERMS OF SERVICE</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-8">
          Terms of Service
        </h1>

        <div className="text-foreground space-y-6 text-base leading-relaxed">
          <p className="text-muted-foreground">
            Last Updated: January 27, 2025
          </p>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              1. Agreement to Terms
            </h2>
            <p>
              By accessing and using DRX CRM ("Service"), you agree to be bound
              by these Terms of Service. If you do not agree to abide by the
              foregoing, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">2. Use License</h2>
            <p>
              Permission is granted to temporarily download one copy of the
              materials (information or software) on DRX CRM for personal,
              non-commercial transitory viewing only. This is the grant of a
              license, not a transfer of title, and under this license you may
              not:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Modifying or copying the materials</li>
              <li>
                Using the materials for any commercial purpose or for any public
                display
              </li>
              <li>
                Attempting to reverse engineer, decompile, or disassemble any
                software
              </li>
              <li>
                Removing any copyright or other proprietary notations from the
                materials
              </li>
              <li>
                Transferring the materials to another person or "mirroring" the
                materials on any other server
              </li>
              <li>
                Violating any applicable laws or regulations in your
                jurisdiction
              </li>
              <li>Accessing the Service through automated scripts or tools</li>
              <li>Attempting to gain unauthorized access to the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">3. Disclaimer</h2>
            <p>
              The materials on DRX CRM are provided on an "as is" basis. DeelRx
              makes no warranties, expressed or implied, and hereby disclaims
              and negates all other warranties including, without limitation,
              implied warranties or conditions of merchantability, fitness for a
              particular purpose, or non-infringement of intellectual property
              or other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">4. Limitations</h2>
            <p>
              In no event shall DeelRx or its suppliers be liable for any
              damages (including, without limitation, damages for loss of data
              or profit, or due to business interruption) arising out of the use
              or inability to use the materials on DRX CRM, even if DeelRx or an
              authorized representative has been notified orally or in writing
              of the possibility of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              5. Accuracy of Materials
            </h2>
            <p>
              The materials appearing on DRX CRM could include technical,
              typographical, or photographic errors. DeelRx does not warrant
              that any of the materials on the Service are accurate, complete,
              or current. DeelRx may make changes to the materials contained on
              the Service at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              6. Materials and Content
            </h2>
            <p>
              The materials contained on DRX CRM are protected by applicable
              copyright and trademark law. You are granted a limited,
              non-exclusive, non-transferable license to view and use the
              materials for personal business purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              7. Limitations of Liability
            </h2>
            <p>
              In no case shall DeelRx, its suppliers, or any related parties be
              liable to you or any third party for any decision made or action
              taken in reliance on information in the Service, or for any
              consequential, incidental, indirect, special, or punitive damages
              arising out of or relating to your use of the Service, even if
              DeelRx has been advised of the possibility of such damages.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              8. Accuracy of Information
            </h2>
            <p>
              You are responsible for maintaining the accuracy and completeness
              of all information you provide to DRX CRM. This includes business
              information, customer data, and transaction records. DeelRx is not
              liable for any inaccuracies in data you enter into the system.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              9. Revisions and Errata
            </h2>
            <p>
              The materials appearing on DRX CRM may include technical,
              typographical, or photographic errors. DeelRx will not be held
              responsible for these errors and will make corrections as
              warranted at its sole discretion. DeelRx does not make any
              commitment to update the materials on the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">10. Links</h2>
            <p>
              DeelRx has not reviewed all of the sites linked to its website and
              is not responsible for the contents of any such linked site. The
              inclusion of any link does not imply endorsement by DeelRx of the
              site. Use of any such linked website is at the user's own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">11. Modifications</h2>
            <p>
              DeelRx may revise these Terms of Service for the Service at any
              time without notice. By using this Service, you are agreeing to be
              bound by the then current version of these Terms of Service. We
              will notify users of material changes by updating the "Last
              Updated" date and may also provide additional notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">12. Governing Law</h2>
            <p>
              The materials appearing on DRX CRM and this Terms of Service are
              governed by and construed in accordance with the laws of the
              United States, and you irrevocably submit to the exclusive
              jurisdiction of the courts in that location.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              13. Prohibited Conduct
            </h2>
            <p>
              You agree not to engage in any of the following prohibited
              conduct:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Harassing or causing distress to other users</li>
              <li>Transmitting obscene or offensive content</li>
              <li>Disrupting the normal flow of dialogue in the Service</li>
              <li>
                Attempting to gain unauthorized access to systems or networks
              </li>
              <li>Transmitting viruses, worms, or other malicious code</li>
              <li>Collecting or tracking personal information of others</li>
              <li>Spamming or sending unsolicited communications</li>
              <li>Using the Service for illegal purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              14. Account Termination
            </h2>
            <p>
              DeelRx reserves the right to suspend or terminate your account at
              any time for violation of these Terms of Service or for any reason
              at its sole discretion. Upon termination, you may lose access to
              your data stored in the Service. DeelRx is not liable for any loss
              of data resulting from account termination.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              15. Service Availability
            </h2>
            <p>
              DeelRx strives to maintain 99% uptime but does not guarantee
              uninterrupted service availability. The Service may be subject to
              maintenance, updates, or be temporarily unavailable. DeelRx is not
              liable for any downtime or loss of access to the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">16. Data Backup</h2>
            <p>
              While DeelRx implements backup procedures, you are responsible for
              maintaining your own backups of critical data. DeelRx is not
              responsible for data loss due to system failures, user error, or
              other causes beyond our reasonable control.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">17. Payment Terms</h2>
            <p>
              If you subscribe to a paid plan, you agree to pay all fees
              according to the pricing plan you select. Billing occurs on a
              recurring basis unless you cancel. Refunds are not provided for
              partial month usage unless required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              18. Intellectual Property Rights
            </h2>
            <p>
              The Service, including all content and functionality, is the
              exclusive property of DeelRx or its licensors. You retain
              ownership of data you provide to the Service. By submitting
              content to the Service, you grant DeelRx a license to use such
              content as necessary to provide the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              19. Entire Agreement
            </h2>
            <p>
              These Terms of Service and our Privacy Policy constitute the
              entire agreement between you and DeelRx regarding the Service and
              supersede all prior and contemporaneous agreements, whether
              written or oral.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">
              20. Contact Information
            </h2>
            <p>
              If you have any questions about these Terms of Service, please
              contact us:
            </p>
            <div className="mt-4 space-y-2">
              <p>
                <strong>Email:</strong> legal@deelrx.com
              </p>
              <p>
                <strong>Mailing Address:</strong>
              </p>
              <p className="ml-4">
                DeelRx Corporation
                <br />
                Legal Department
                <br />
                United States
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
