import { describe, expect, it } from "vitest";
import { POST } from "../app/api/waitlist/route";

describe("Waitlist API route", () => {
  it("rejects requests missing valid email", async () => {
    const request = new Request("http://localhost/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid-email", businessName: "Acme Retail" }),
    });

    const res = await POST(request);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/valid email/i);
  });

  it("rejects requests missing business name", async () => {
    const request = new Request("http://localhost/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "operator@example.com", businessName: "  " }),
    });

    const res = await POST(request);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/business name/i);
  });

  it("accepts valid applicant details and returns success", async () => {
    const request = new Request("http://localhost/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "operator@example.com",
        businessName: "Northstar Retail",
        role: "owner_operator",
        teamSize: "1-5",
        tooling: "Spreadsheets",
      }),
    });

    const res = await POST(request);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toMatch(/recorded/i);
  });
});
