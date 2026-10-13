# DRX Legal Response Template: Vendor & Security Assessment

**Category**: Vendor Questionnaire & Security Due Diligence  
**Applicability**: Responding to partner, enterprise merchant, bank, or insurer questionnaires regarding DRX technical safeguards, data sovereignty, and compliance.  
**Governing Entity**: Wrelik Brands LLC (DRX / Deelrx CRM)  
**Last Reviewed**: October 2026  

---

### Core Architectural Safeguards

When partners or vendors request confirmation of DRX data protection standards:

| Security Domain | DRX Implementation |
|---|---|
| **Encryption in Transit** | TLS 1.3 enforced across all web, iOS, and Android clients. HTTP automatically redirects to HTTPS. Forward secrecy required. |
| **Encryption at Rest** | AES-256 bit encryption on persistent data volumes, databases, and disaster recovery snapshots. |
| **Field-Level Protection** | Sensitive identifiers, customer contact data, and drop-off addresses are protected with application-level cryptographic keys. |
| **Tenant Isolation** | Server-authoritative tenant scoping on all queries and mutations. Cross-tenant access is architecturally barred. |
| **Authentication & Roles** | Role-based access control (Owner, Manager, Supervisor, Cashier, Staff). Multi-factor authentication supported. |
| **Mobile & Offline Caching** | Native secure keychains (iOS Keychain / Android EncryptedSharedPreferences). Offline register cache uses encrypted SQLCipher. |
| **Third-Party Data Selling** | **Strict Zero-Sale Policy**: Customer data, phone numbers, and transaction records are NEVER sold, rented, or brokered to third parties. |
| **10DLC Mobile Messaging** | Pure operational notifications with explicit opt-in. Unshared carrier numbers with mandatory STOP / HELP keyword processing. |
| **Automated Purging** | Configurable automated retention cleanup (Alias: 30 days, Standard: 180 days, Full Customer: 365 days). |

---

## Template: Vendor Privacy & Security Inquiry Response

**Subject**: `Deelrx CRM Security & Data Protection Summary - [{{vendor_name}}]`

```markdown
Dear {{vendor_contact_name}},

Thank you for your inquiry regarding the data protection and security posture of DRX (presented commercially as Deelrx CRM), operated by Wrelik Brands LLC.

DRX is engineered as a privacy-first operating system for independent regulated retailers. Below is a summary of our security architecture and privacy policies addressing your assessment:

1. Data Sovereignty & Multi-Tenancy:
   Every subscribing business is partitioned with server-authoritative tenant isolation. Store operators retain ownership of their commercial records. DRX never shares, commingles, or transfers store records across merchant accounts.

2. Encryption Standards:
   - In Transit: TLS 1.3 with modern, restricted cipher suites.
   - At Rest: AES-256 persistent volume encryption, complemented by field-level encryption for sensitive contact identifiers.
   - Endpoint: Session tokens reside in hardware-backed secure keychains on mobile devices.

3. Telecommunications & Consumer Data Privacy:
   - Wrelik Brands LLC does not sell, rent, license, or monetize customer records, customer mobile numbers, or transaction logs.
   - SMS communications strictly comply with A2P 10DLC carrier standards, used solely for direct store-to-customer operational notices upon affirmative consent.

4. Regulatory Scope:
   DRX is general regulated-retail management software. It is not healthcare, HIPAA, or prescription pharmacy software. Merchants are responsible for local sales tax calculations and lawful inventory operations.

Our complete legal agreements, terms of service, and privacy notices are publicly accessible at https://deelrxcrm.com/legal.

Sincerely,

Security & Compliance Review Team
Wrelik Brands LLC
support@deelrxcrm.com
```
