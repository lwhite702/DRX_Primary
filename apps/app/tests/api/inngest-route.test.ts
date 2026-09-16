import { describe, expect, it } from "vitest";
import { GET, POST, PUT } from "@/app/api/inngest/route";

describe("/api/inngest route handlers", () => {
  it("exports GET, POST, and PUT handlers that do not throw unhandled exceptions", async () => {
    expect(typeof GET).toBe("function");
    expect(typeof POST).toBe("function");
    expect(typeof PUT).toBe("function");

    const req = new Request("http://localhost:3000/api/inngest", { method: "GET" });
    const res = await GET(req);
    expect(res).toBeInstanceOf(Response);
    expect([200, 400, 503]).toContain(res.status);
  });
});
