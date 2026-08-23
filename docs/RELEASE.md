# Release Process

This document summarizes DRX release execution.

Canonical policy source:

- `../RELEASE_POLICY.md`
- `../CHECKLIST_PRERELEASE.md`
- `../VERSIONING_POLICY.md`

## Promotion Path

1. `feature/*` -> `development`
2. `development` -> `staging`
3. `staging` -> `main`

## Release Steps

1. Confirm staging is release-eligible and checks are green.
2. Verify release artifacts:
- `CHANGELOG.md`
- `VERSION`
- all product-version surfaces aligned (`pnpm release:integrity`)
3. Open and approve PR from `staging` to `main`.
4. Merge the release PR only after approval, create tag `vX.Y.Z`, and run `pnpm release:verify X.Y.Z --evidence PATH` against the exact distribution evidence.

## Verification evidence

`release:verify` runs the canonical integrity gate before evaluating a versioned,
sanitized JSON evidence file. Schema version `1` requires:

- the exact product version and 40-character release SHA;
- credentialed checkout and second-tenant isolation verification timestamps;
- `web-production` evidence with the exact deployment SHA;
- `ios-app-store` evidence with a positive build number, signed-build proof, and a physical-device notification timestamp;
- `android-play` evidence with a positive version code, signed-build proof, and a physical-device notification timestamp.

Every destination also carries the exact source SHA, an HTTPS evidence link, and
a non-future verification timestamp. Keep credentials, customer data, and raw
production payloads out of this file. A single preview, archive, store build, or
arbitrary destination cannot satisfy release verification.
