# Release Process

This document outlines the lightweight process for releasing a new version of the application.

## Prerequisites

- Ensure you are on the `main` branch and it is up to date.
- Ensure all tests pass.

## Steps

1. **Decide Change Type**: Determine if the changes constitute a Major, Minor, or Patch bump based on `docs/VERSIONING.md`.

2. **Update Version**:
   - Update the `version` field in `package.json`.
   - Example: Change `"version": "0.1.0"` to `"version": "0.2.0"`.

3. **Update Changelog**:
   - Add a new entry to `CHANGELOG.md` for the new version.
   - Follow the format:

     ```markdown
     ## [Version] - YYYY-MM-DD

     ### Added

     - Feature 1
     - Feature 2

     ### Changed

     - Description of change

     ### Fixed

     - Description of fix
     ```

   - Ensure entries are factual and reflect shipped behavior.

4. **Commit and Merge**:
   - Create a PR with the version and changelog updates.
   - Ensure the PR title includes the release version (e.g., `chore: release v0.2.0`).
   - Merge the PR to `main` after approval (and passing CI checks).

5. **Tag Release** (Post-Merge):
   - Pull the latest `main`.
   - Create a git tag: `git tag vX.Y.Z`
   - Push the tag: `git push origin vX.Y.Z`

## Automation

The repository includes automation to ensure that:

- Every `package.json` version bump has a corresponding `CHANGELOG.md` entry.
- Version updates are checked in CI.
