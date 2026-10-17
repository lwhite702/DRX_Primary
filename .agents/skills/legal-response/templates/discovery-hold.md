# DRX Legal Response Template: Discovery & Legal Holds

**Category**: Litigation & Dispute Preservation  
**Applicability**: Internal notice to retail store owners, managers, and system custodians when records must be preserved for litigation, audit, or formal dispute.  
**Governing Entity**: Wrelik Brands LLC (DRX / Deelrx CRM)  
**Last Reviewed**: October 2026  

---

### Purpose
In DRX, automated retention cleanup permanently deletes inactive customer profiles according to the configured mode (Alias Mode: 30 days, Standard Mode: 180 days, Full Customer Mode: 365 days).
When a lawsuit, dispute, regulatory audit, or subpoena arises, operators and custodians have an affirmative duty to preserve electronic records and suspend automated purges for responsive data.

---

## Template: Legal Preservation Notice to Store Custodians

**CONFIDENTIAL & PRIVILEGED ATTORNEY-CLIENT COMMUNICATION**  
**Subject**: `LEGAL HOLD NOTICE - Matter: [{{matter_name}}] - Immediate Preservation Required`

```markdown
CONFIDENTIAL ATTORNEY-CLIENT PRIVILEGED COMMUNICATION
DO NOT FORWARD OUTSIDE AUTHORIZED CUSTODIAN GROUP

Date: {{notice_date}}
To: {{custodian_names_and_roles}}
From: Store Ownership / Legal Counsel
Matter: {{matter_name}} (Reference: {{matter_reference}})

### IMMEDIATE ACTION REQUIRED: SUSPENSION OF RECORD DELETION

You are receiving this Legal Hold Notice because you manage or access operational records that may be relevant to the dispute or legal matter referenced above.

Effective immediately, you must preserve all documents, data, and Electronically Stored Information (ESI) relating to:
- Subject matter: {{hold_scope_description}}
- Relevant parties / customer aliases: {{relevant_persons_or_aliases}}
- Date range: {{start_date}} through present
- Systems involved: DRX web register, mobile registers, downloaded spreadsheet exports, receipt copies, inventory adjustment logs, and staff communication channels.

### MANDATORY PRESERVATION OBLIGATIONS:

1. SUSPEND DELETIONS:
   - Do NOT run manual deletion scripts or delete customer profiles, aliases, or transaction records related to this matter.
   - For store administrators: Temporarily disable automated retention cleanup in DRX under Settings → Privacy Protocol Dashboard to prevent scheduled purging of inactive records while this matter remains pending.
2. PRESERVE EXPORTS:
   - Do NOT discard, overwrite, or shred printed receipts, end-of-day register z-reports, or exported CSV summaries.
   - Store all existing exports in a dedicated, secure folder labeled "PRESERVE - {{matter_reference}}".
3. NO SPOLIATION:
   - Modifying, deleting, backdating, or discarding relevant records constitutes spoliation of evidence, which may subject the store and individuals to severe legal sanctions.

Please confirm that you have read, understood, and enacted this preservation hold by signing/replying to this notice by {{acknowledgment_deadline}}.

For questions regarding what records fall within scope, contact {{legal_contact_email}}.

Acknowledgment:
I confirm receipt of this Legal Hold Notice and have taken all steps to preserve responsive records.
Signed: ___________________________ Date: ______________
```
