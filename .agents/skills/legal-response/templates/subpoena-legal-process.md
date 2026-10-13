# DRX Legal Response Template: Subpoenas & Legal Process

**Category**: Law Enforcement, Subpoena & Legal Process  
**Applicability**: Court orders, formal civil/criminal subpoenas, warrants, regulatory agency inquiry letters.  
**Governing Entity**: Wrelik Brands LLC (DRX / Deelrx CRM)  
**Mandatory Rule**: **ALWAYS REQUIRES LEGAL COUNSEL REVIEW BEFORE TRANSMISSION.** Templates are internal intake starting points only.  
**Last Reviewed**: October 2026  

---

### Universal Escalation Notice
- **All court orders, summons, subpoenas, search warrants, or formal law enforcement contacts must be immediately escalated to designated legal counsel.**
- Store staff, cashiers, and support engineers are **strictly prohibited** from releasing unredacted tenant data, encryption keys, or system exports without written counsel authorization.
- Verify jurisdictional authority (e.g. out-of-state subpoenas must comply with the Uniform Interstate Depositions and Discovery Act or local domestication rules).

---

## Internal Legal Process Intake Protocol

When a store operator or Wrelik support receives formal legal process:

1. **Record Metadata**:
   - Serving party / agency (name, badge/bar number, contact phone, agency address).
   - Receiving party / custodian named (specific store LLC, store owner, or Wrelik Brands LLC).
   - Case number, docket identifier, and issuing court / jurisdiction.
   - Exact date and method of service (in-person, certified mail, email).
   - Return date / response deadline.
2. **Issue Immediate Preservation Hold**:
   - Immediately notify the store administrator to place any identified tenant accounts or records on legal hold to suspend automated retention cleanup.
   - Do NOT delete, alter, or purge any potentially responsive records.
3. **Architecture & Scope Assessment**:
   - Multi-tenant boundary: Wrelik does not volunteer cross-tenant data. Subpoenas must identify the specific target entity or customer identifier.
   - Field-level encryption: Sensitive attributes (e.g., masked contact data, auth tokens) are encrypted at rest using AES-256. Wrelik maintains no backdoors or unverified decryption tools.
   - Automated retention status: If records were permanently hard-deleted under standard retention cleanup prior to service of process, document the operational retention policy.

---

## Template: Formal Counsel Acknowledgment & Objections Framework

**Status**: DRAFT - FOR LEGAL COUNSEL REVIEW ONLY  
**Subject**: `Acknowledgment of Legal Process - Matter [{{case_caption}}] - Reference [{{matter_reference}}]`

```markdown
VIA SECURE ELECTRONIC TRANSMISSION / CERTIFIED MAIL

To: {{issuing_party_or_agency}}
Attention: {{issuing_officer_or_attorney}}
{{agency_or_law_firm_address}}

Re: {{case_caption}}, Case No. {{docket_number}}
    Subpoena / Demand Dated: {{subpoena_date}}
    Response Deadline: {{compliance_deadline}}

Dear {{issuing_officer_or_attorney}},

This letter acknowledges receipt by Wrelik Brands LLC ("Wrelik") of the legal process referenced above on {{service_date}}.

Wrelik provides business management and point-of-sale software ("DRX" / "Deelrx CRM") to independent commercial retail merchants. Wrelik takes its legal obligations seriously while safeguarding the constitutional, statutory, and contractual privacy rights of its subscribers and their retail patrons.

Wrelik is currently reviewing the demand with legal counsel to evaluate jurisdictional authority, statutory compliance, and operational feasibility.

To ensure proper processing without undue operational disruption:

1. Preservation Confirmation: Without admitting the validity of the demand or waiving any legal rights, objections, or privileges, Wrelik has taken reasonable steps to maintain existing electronic records potentially responsive to this matter that remain within active storage.
2. Specific Objections:
   [Insert specific objections as advised by counsel: e.g., overbreadth, lack of extraterritorial jurisdiction, third-party privacy protections under state statutory privacy laws, unreasonable compliance timeline.]
3. Meet and Confer: To discuss a narrowed scope or appropriate protective order, please contact outside counsel representing Wrelik Brands LLC at {{counsel_contact_email}} or {{counsel_contact_phone}}.

Nothing in this communication constitutes a waiver of any rights, claims, objections, or defenses, all of which are expressly reserved.

Sincerely,

Legal Department / Designated Counsel
Wrelik Brands LLC
```
