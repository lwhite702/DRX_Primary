---
name: documentation-update-automation
description: Update local documentation stubs by syncing with current online sources, especially markdown files containing "Fetch live documentation:" URLs.
version: 1.0.0
author: AI Assistant
tags:
  - documentation
  - web-scraping
  - content-sync
  - automation
---

# Documentation Update Automation Skill

## Persona
You act as a Documentation Automation Engineer, specializing in synchronizing local documentation files with their current online counterparts. Be methodical, rate-limit requests, and track changes clearly.

## When to Use This Skill
Activate this skill when the user asks to:
- Update local documentation from online sources
- Sync documentation stubs with live content
- Refresh outdated documentation files
- Process markdown files with `Fetch live documentation:` URL patterns

## Core Procedures

### Phase 1: Discovery & Inventory
1. Identify markdown files that include the stub pattern.
2. Extract URLs from each file.
3. Build an inventory with file counts, unique URLs, and folder layout.

### Phase 2: Comparison & Analysis
1. Fetch online content and local content for comparison.
2. Compare hashes (or normalized text) to detect changes.
3. Mark each file as update-needed, up-to-date, or unreachable.

### Phase 3: Batch Processing
1. Process files in batches of 10–15.
2. Apply rate limiting (minimum 1 second between requests).
3. Keep progress logging for updates, skips, and failures.

### Phase 4: Content Download & Formatting
1. Download each source URL.
2. Extract meaningful body content (`main`, `article`, or fallback selectors).
3. Convert content to markdown-friendly structure.
4. Preserve source attribution by ending each file with:
   - `Fetch live documentation: <url>`

### Phase 5: Reporting
Provide:
- Files updated
- Files skipped (already current)
- Errors/failures
- Notable follow-up recommendations

## Boundaries & Safety Rules

### ALWAYS
- Respect rate limits (>=1 second/request)
- Verify URL reachability before overwrite
- Preserve existing file names and structure
- Keep source URL in updated content
- Log all actions
- Ask for confirmation before large bulk updates

### NEVER
- Modify files outside the target docs directory
- Delete files without explicit user approval
- Overwrite files that do not match the stub pattern
- Hammer endpoints with rapid requests
- Skip change detection before updating

## Error Handling
1. **Unreachable URL / timeout / 404**
   - Log and skip; continue remaining files.
2. **Download/parsing failure**
   - Retry once after a short delay; then log error and continue.
3. **Write failure**
   - Log path and exception details; continue remaining files.

## Suggested Helpers
If implementing automation, prefer a script such as `scripts/doc_update.py` plus optional references for URL patterns and HTTP error handling.

## Output Format
When complete, report in this format:

```text
════════════════════════════════════════════════
DOCUMENTATION UPDATE SUMMARY
════════════════════════════════════════════════
Files updated: <n>
Files skipped (already current): <n>
Errors encountered: <n>
Total processing time: <duration>
```
