# Docs index and placement

Repository-level maintainer contracts generated or proposed through Moxie live under `moxie-docs/`. Root Markdown files remain the source for repository policy and onboarding, while app-specific operational guidance stays beside its app when established by repository convention.

Current WRE-31 maintainer contracts:

- `moxie-docs/production-domain-auth-routing.md`
- `moxie-docs/operational-provider-lifecycle.md`

For application routing, `apps/app/proxy.ts` owns proxy and redirect behavior. Route classification helpers live in `apps/app/lib/auth/route-classification.ts`.
