import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checklistPath = path.join(root, "docs/testing/BETA_LAUNCH_CHECKLIST.md");

const content = `# BETA_LAUNCH_CHECKLIST

Generated: ${new Date().toISOString()}

## Beta Launch Rule
- Beta may ship only if **Gate 0, Gate 1, Gate 2, and Gate 3** pass at **100%**.
- Any failure in required gates is an automatic **NO-GO**.

## Gate Verification
- [ ] Gate 0 — Build Stability (Required): install determinism, lint, typecheck, build
- [ ] Gate 1 — Auth Stability (Required): routing/session/onboarding behavior
- [ ] Gate 2 — Environment Discipline (Required): policy + matrix discipline checks
- [ ] Gate 3 — Data Integrity (Required): POS contract + transactional integrity checks
- [ ] Gate 4 — Permissions + Audit (Optional): role behavior and audit trails
- [ ] Gate 5 — Observability (Optional): security + performance smoke checks
- [ ] Gate 6 — UX Readiness (Optional): e2e + accessibility checks

## Release Controls
- [ ] Feature freeze confirmation
- [ ] Environment parity validation
- [ ] Secrets validation
- [ ] Production env var audit
- [ ] DNS validation
- [ ] SSL validation
- [ ] Payment live key validation
- [ ] Analytics live mode validation
- [ ] Admin access validation
- [ ] Rate limiting confirmation
- [ ] Monitoring alerts active
- [ ] Rollback plan documented
- [ ] Hotfix procedure documented

## Required Evidence
- CI gate run URL:
- docs/testing/PRODUCTION_READINESS_REPORT.md:
- docs/testing/FULL_GATE_RESULTS.json:
- Coverage report path:
- Security scan report path:
- Performance report path:
- Observability validation run:

## Deferred Scope Tracking
- [ ] Legacy Supabase call-site migration tracked separately
- [ ] Legacy POS engine call-site migration tracked separately
- [ ] Follow-up inventory document linked

## Sign-off
- QA Architect:
- Release Engineering:
- Product Owner:
`;

fs.mkdirSync(path.dirname(checklistPath), { recursive: true });
fs.writeFileSync(checklistPath, content);
console.log(`Wrote ${path.relative(root, checklistPath)}`);
