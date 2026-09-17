import { expect, it } from "vitest";
import { GET } from "../../app/api/featurebase/auth/route";

it("returns 410 Gone with private no-store headers because Featurebase is retired", async () => {
  const response = await GET();
  expect(response.status).toBe(410);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  const data = await response.json();
  expect(data.error).toContain("retired");
});

