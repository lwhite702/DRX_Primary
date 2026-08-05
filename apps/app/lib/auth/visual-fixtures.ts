export function isAuthVisualFixtureEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.VISUAL_FIXTURES === "true"
  );
}
