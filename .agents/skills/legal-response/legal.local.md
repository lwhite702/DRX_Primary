# DRX Legal Response Configuration & Template Registry

**Product**: DRX / Deelrx CRM  
**Operating Entity**: Wrelik Brands LLC  
**Support Contact**: `support@deelrxcrm.com`  
**Public Legal Hub**: `https://deelrxcrm.com/legal`  
**Help Center**: `https://docs.deelrxcrm.com`  

This configuration file connects the `legal-response` agent skill to DRX-specific templates, escalation matrices, and organizational boundaries.

---

## Configured Template Mappings

| Inquiry Type | Short Codes | Template File | Escalation Level |
|---|---|---|---|
| **Data Subject Request** | `dsr`, `deletion`, `access`, `privacy-request` | `templates/data-subject-request.md` | Staff review; escalate if dispute, minor, or regulatory authority. |
| **Subpoena / Legal Process** | `subpoena`, `court-order`, `law-enforcement` | `templates/subpoena-legal-process.md` | **Mandatory Legal Counsel Review.** |
| **Litigation / Discovery Hold** | `hold`, `litigation-hold`, `preservation` | `templates/discovery-hold.md` | Senior Counsel / Management approval. |
| **Vendor Due Diligence** | `vendor`, `security-check`, `soc2-inquiry` | `templates/vendor-due-diligence.md` | Operations / Technical lead review. |

---

## Universal Escalation Matrix for DRX

Whenever an agent handles a legal inquiry for DRX, verify these four non-negotiable boundaries:

1. **Healthcare / Pharmacy Inquiries**: If an inquiry assumes DRX is HIPAA-compliant or handles medical prescriptions, IMMEDIATELY flag that DRX is strictly a regulated-retail operating system and NOT a pharmacy or medical dispensing platform.
2. **Tax Filing Inquiries**: If a merchant asks DRX to assume liability for sales tax filing or compliance audits, clarify that DRX provides operational receipts only; the merchant remains solely responsible for municipal/state tax compliance.
3. **Law Enforcement Requests**: Never disclose customer records or credentials verbally or informally. Require formal written legal process and route immediately to designated counsel.
4. **Third-Party Data Sharing**: Affirm that DRX has a strict zero-sale policy: mobile phone numbers and customer details are NEVER sold or shared with third parties or data brokers.
