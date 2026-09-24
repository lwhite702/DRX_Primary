/**
 * Legacy compatibility surface retained for tests and one-off migration scripts.
 * Application runtime data access is Convex-only; this module intentionally has
 * no database driver or network client.
 */
export const db = {} as any;
export default db;
