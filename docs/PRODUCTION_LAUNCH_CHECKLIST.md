# DRX Production Launch Checklist

**Version:** 0.5.5  
**Date:** 2026-04-09  
**Status:** RELEASE GATE REMEDIATION IN PROGRESS

---

## Pre-Launch Verification

### 1. Code Quality & Compliance ✅

| Item | Status | Evidence |
|------|--------|----------|
| All third-party SDKs via @wrelik/* | ✅ PASS | PostHog, Sentry migrated |
| No direct vendor imports | ✅ PASS | grep verification clean |
| ESLint passes | ✅ PASS | CI gate 0 |
| TypeScript strict mode | ✅ PASS | CI gate 0 |
| Unit tests | ✅ PASS | 231 tests on 2026-07-30 |
| Unit coverage >90% | ❌ NOT MET | 28.96% lines/statements; see `docs/testing/COVERAGE_RATCHET.md` |

### 2. Web Application ✅

| Item | Status | Notes |
|------|--------|-------|
| Build passes | ✅ PASS | `pnpm build` succeeds |
| All routes accessible | ✅ PASS | E2E tests pass |
| Auth flow complete | ✅ PASS | Clerk integration |
| POS checkout flow | ✅ PASS | Core business logic |
| Error boundaries | ✅ PASS | Sentry integrated |
| Analytics tracking | ✅ PASS | PostHog via @wrelik/analytics |

### 3. Mobile Application ✅

| Item | Status | Notes |
|------|--------|-------|
| POS screen functional | ✅ PASS | Full implementation in tabs/index.tsx |
| Cart management | ✅ PASS | Zustand store |
| Customer selection | ✅ PASS | Loyalty tiers supported |
| Checkout flow | ✅ PASS | Cash, card, credit |
| Sentry initialized | ✅ PASS | @wrelik/errors/react-native |
| EAS configured | ✅ PASS | eas.json present |

### 4. Observability ✅

| Service | Web | Mobile | Server |
|---------|-----|--------|--------|
| PostHog Analytics | ✅ | ⏳ Ready | ✅ |
| PostHog Feature Flags | ✅ | ✅ | ⏳ Pending |
| Sentry Error Tracking | ✅ | ✅ | ✅ |
| User Identification | ✅ | ⏳ Ready | ✅ |

### 5. Security ✅

| Item | Status | Notes |
|------|--------|-------|
| No secrets in git | ✅ PASS | .env files gitignored |
| HTTPS enforced | ✅ PASS | Vercel config |
| Auth bypass disabled (prod) | ⚠️ VERIFY | Check NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING |
| PII encryption keys | ✅ PASS | DRX_PII_KEY present |
| RBAC enforcement | ✅ PASS | Middleware + API guards |

### 6. Environment Variables ✅

| Variable | Required | Verified |
|----------|----------|----------|
| DATABASE_URL | Yes | ✅ |
| CLERK_SECRET_KEY | Yes | ✅ |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Yes | ✅ |
| SENTRY_DSN | Yes | ✅ |
| NEXT_PUBLIC_POSTHOG_KEY | Yes | ✅ |
| NEXT_PUBLIC_POSTHOG_HOST | Yes | ✅ |
| RESEND_API_KEY | Yes | ✅ |
| R2_ACCESS_KEY_ID | Yes | ✅ |
| R2_SECRET_ACCESS_KEY | Yes | ✅ |
| INNGEST_EVENT_KEY | Yes | ✅ |
| INNGEST_SIGNING_KEY | Yes | ✅ |

---

## Launch Sequence

### Phase 1: Internal Alpha (Week 1)
- [ ] Deploy to production with `ops.maintenance.alpha` flag enabled
- [ ] Limit access to engineering + QA team (5-10 users)
- [ ] Monitor Sentry for critical errors
- [ ] Validate core POS flow manually

### Phase 2: Closed Beta (Week 2-3)
- [ ] Enable `beta.web.dashboard` flag for beta users
- [ ] Invite 50-100 beta users from waitlist
- [ ] Set up PostHog dashboard for key metrics
- [ ] Daily Sentry review for new issues

### Phase 3: TestFlight Beta (Week 2-4)
- [ ] Submit to TestFlight (internal)
- [ ] Add 10-20 internal testers
- [ ] Validate POS, inventory, customers on device
- [ ] Open TestFlight to 100-500 beta users

### Phase 4: Production GA (Week 4+)
- [ ] Remove beta flags for GA features
- [ ] Enable all waitlist users
- [ ] Submit to App Store
- [ ] Monitor metrics and scale

---

## Rollback Plan

### Immediate Rollback (< 5 min)
1. Vercel: Revert to previous deployment
   ```
   vercel rollback [deployment-url]
   ```

### Kill Switch Activation
1. Enable `ops.maintenance.emergency` flag in PostHog
2. All users see maintenance page

### Database Rollback
1. Use Neon branch restore
2. Execute migration rollback if needed

### Incident Communication
1. Update status page
2. In-app banner via `ops.incident.active` flag
3. Email to affected users via Resend

---

## Monitoring Thresholds

| Metric | Target | Alert |
|--------|--------|-------|
| Error rate | <0.5% | >1% |
| API P95 latency | <500ms | >1000ms |
| Crash rate (mobile) | <0.5% | >2% |
| Sentry issue spike | Baseline | >200% |

---

## Post-Launch Tasks

### Week 1
- [ ] Daily Sentry triage
- [ ] PostHog funnel analysis
- [ ] User feedback review

### Week 2
- [ ] Performance optimization based on metrics
- [ ] Feature flag cleanup (remove fully rolled out)
- [ ] Mobile crash analysis

### Week 4
- [ ] First retrospective
- [ ] Roadmap planning based on feedback
- [ ] Documentation updates

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineering Lead | | | |
| QA Lead | | | |
| Product Owner | | | |
| Security Review | | | |

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-09
