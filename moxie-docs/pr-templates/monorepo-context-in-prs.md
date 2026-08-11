# Monorepo context to include in PRs

PR descriptions must identify every product surface affected by a change:

- `apps/app`: authenticated operator web application at the canonical `.app` origin;
- `apps/marketing`: public marketing, legal, and support site at the canonical `.com` origin;
- `apps/mobile`: Expo mobile client;
- `apps/ios`: native iOS client.

For routing changes, name `apps/app/proxy.ts` as the owner of proxy and redirect behavior and include `apps/app/lib/auth/route-classification.ts` when host or path classification changes. State whether browser redirects, API status codes, public legal/support routes, Clerk origins, previews, metadata, sitemaps, robots files, and App Store URLs are affected.

Do not claim cross-platform parity unless the changed workflow has been verified on every affected client.
