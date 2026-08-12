# Production domains, public routes, and auth routing

This maintainer contract describes the web behavior introduced by WRE-31. The source of truth is `apps/app/proxy.ts` together with `apps/app/lib/auth/route-classification.ts`; page-level redirects mirror the proxy contract.

## Canonical origins

| Surface | Canonical origin | Responsibility |
| --- | --- | --- |
| Operator app | `https://www.deelrxcrm.app` | Authentication, onboarding, and protected operator workflows |
| Marketing | `https://www.deelrxcrm.com` | Public marketing, legal, and support content |
| Clerk auth | `https://clerk.deelrxcrm.app` | Clerk-hosted authentication traffic |

`accounts.deelrxcrm.app`, legacy `*.deelrx.app` hosts, `*.vercel.app` previews, and localhost are classified explicitly for compatibility. Set `NEXT_PUBLIC_APP_URL` to the canonical operator origin without a trailing slash.

## Public route matrix

Requests to the operator app use permanent redirects so there is one public copy of legal and support content.

| Operator-app path | Marketing destination | Status |
| --- | --- | --- |
| `/privacy`, `/privacy-policy`, `/legal/privacy` | `https://www.deelrxcrm.com/legal/privacy` | 308 |
| `/terms`, `/legal/terms` | `https://www.deelrxcrm.com/legal/terms` | 308 |
| `/support` | `https://www.deelrxcrm.com/support` | 308 |

On the marketing surface, `/privacy` and `/privacy-policy` permanently redirect to `/legal/privacy`, and `/terms` permanently redirects to `/legal/terms`. The canonical support page is served at `/support`.

## Authentication behavior

- Signed-out browser requests for protected app routes redirect to `/login?redirect_url=<original path and query>`.
- Signed-out protected API requests return `401` JSON with `{"error":"Unauthorized"}`; API clients must not follow an HTML login redirect.
- `/api/public/**`, `/api/webhooks/**`, `/api/uploadthing/**`, static assets, and Clerk entry routes are public by route classification.
- Signed-in users who have not completed onboarding are routed to `/onboarding`; completed users are routed to `/dashboard`.
- When Clerk server configuration is absent, the fallback path preserves public/auth UI routes but still denies protected APIs and redirects protected browser routes. This fallback is availability behavior, not an authentication bypass.
- Test bypasses and visual fixtures are test-only controls and must remain disabled in production.

## Change checklist

When changing a domain or route:

1. Update route classification, proxy redirects, page redirects, metadata, sitemap, and robots files on both web surfaces.
2. Update Clerk allowed origins and redirect URLs outside the repository.
3. Preserve JSON `401` behavior for protected APIs.
4. Extend `apps/app/tests/auth/route-classification.test.ts` and `apps/app/tests/middleware.test.ts`.
5. Verify the canonical URLs as an unauthenticated client, including redirect status and destination.
6. Keep App Store marketing, support, and privacy URLs aligned in `apps/marketing/lib/app-store-metadata.ts`.

## Runtime note

WRE-31 currently contains conflicting runtime declarations. `.nvmrc`, `.node-version`, root package engines, release preflight, and most CI jobs enforce Node `20.19.0`, while the Dockerfile, version workflow, and existing runtime docs reference Node `22.23.1`. Resolve those files to one approved version before merge; documentation must not claim that local, CI, and container runtimes are aligned until the enforcement files agree.
