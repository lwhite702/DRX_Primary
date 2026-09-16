/** WRE-92: the legacy title-based seed publisher is intentionally retired. */
console.error(
  "Help Center sync moved to the repository root. Run pnpm featurebase:export:help-center, then pnpm featurebase:import:help-center:dry. See docs/featurebase/SYNC.md.",
);
process.exitCode = 1;
