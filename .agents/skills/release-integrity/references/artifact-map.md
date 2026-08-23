# DRX release artifact map

## Version surfaces

`VERSION` is the product SemVer source of truth. `scripts/version.js` synchronizes and verifies:

- root, web, and mobile package versions;
- Expo application version;
- every iOS `MARKETING_VERSION` in `project.yml` and the Xcode project;
- runtime version labels, which must read native or package metadata rather than embed SemVer literals.

iOS `CURRENT_PROJECT_VERSION` and the EAS/Play Android version code are independent build identifiers. The repository verifies local consistency but cannot establish their next store-safe value without current provider evidence.

## Evidence ladder

| State | Minimum evidence | Allowed records |
| --- | --- | --- |
| Planned | Approved product direction and tracked engineering scope | Product record, roadmap, `[Unreleased]` intent where implementation work is active |
| Implemented | Exact merged SHA plus relevant automated and runtime verification | Technical `[Unreleased]`, implementation issue evidence |
| Released | Implemented evidence plus matching version/tag/SHA and target deployment or store/device proof | Dated technical changelog, customer changelog, published release notes |

Use source code as truth for implementation, Google Drive for approved product direction, Linear for scope and acceptance, GitHub for source/version history, and provider records for distribution.

`scripts/release/verify.mjs` enforces release evidence schema version `1`. A DRX cross-platform release requires exact-SHA web production evidence, signed iOS and Android distribution identifiers, physical-device notification evidence on both native platforms, credentialed checkout evidence, and second-tenant isolation evidence. One arbitrary destination never establishes a released state.

## Roadmap and changelog responsibilities

- `CHANGELOG.md`: canonical technical history; one leading `[Unreleased]` section.
- `docs/help-center-export/roadmap/customer-roadmap.md`: directional planned work; never distribution proof.
- `docs/help-center-export/changelog/customer-changelog.md`: customer-visible shipped behavior only.
- Featurebase: external projection of the maintained customer documents. Importers default to a local dry run, match stable identities, and require `--publish` for external mutation.

## Approval checkpoints

Repository edits and dry runs remain inside the tracked engineering issue. Obtain explicit approval immediately before creating tags or releases, deploying production, submitting store builds, publishing Featurebase content, or notifying customers. Read back every approved external mutation and record only sanitized evidence.

## CI dependency authority

Release/version CI is deterministic and repository-local. `scripts/release/ci-dependency-allowlist.json` is the only allowlist for MCP use in CI. An entry must name the exact CI source and command plus an existing repository-relative implementation path. URL-backed, `npx`, `pnpm dlx`, `uvx`, Docker, HAPI-discovered, or otherwise ephemeral MCP dependencies are rejected even if listed. HAPI may help discover candidates for separate review; it never supplies release truth or a required gate.
