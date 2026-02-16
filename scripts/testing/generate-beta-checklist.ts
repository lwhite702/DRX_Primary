import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checklistPath = path.join(root, "docs/testing/BETA_LAUNCH_CHECKLIST.md");

const content = `# BETA_LAUNCH_CHECKLIST

Generated: ${new Date().toISOString()}

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
- Coverage report path:
- Security scan report path:
- Performance report path:
- Observability validation run:

## Sign-off
- QA Architect:
- Release Engineering:
- Product Owner:
`;

fs.mkdirSync(path.dirname(checklistPath), { recursive: true });
fs.writeFileSync(checklistPath, content);
console.log(`Wrote ${path.relative(root, checklistPath)}`);
