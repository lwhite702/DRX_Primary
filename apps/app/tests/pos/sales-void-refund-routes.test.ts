import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  businessClient: vi.fn(),
  mutation: vi.fn(),
}));

vi.mock("@/lib/business/convex-server", () => ({
  businessClient: mocks.businessClient,
}));

import { POST as POST_VOID } from "@/app/api/sales/[id]/void/route";
import { POST as POST_REFUND } from "@/app/api/sales/[id]/refund/route";

describe("POST /api/sales/[id]/void and /refund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.businessClient.mockResolvedValue({
      client: {
        mutation: mocks.mutation,
      },
      businessId: "business_123",
      expectedUserId: "user_123",
    });
  });

  describe("void route", () => {
    it("returns 400 when reason is missing", async () => {
      const req = new NextRequest("http://localhost/api/sales/sale_1/void", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const res = await POST_VOID(req, { params: { id: "sale_1" } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("reason is required");
    });

    it("returns 401 when unauthorized", async () => {
      mocks.businessClient.mockRejectedValue(new Error("UNAUTHORIZED: missing token"));
      const req = new NextRequest("http://localhost/api/sales/sale_1/void", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Accidental scan" }),
      });
      const res = await POST_VOID(req, { params: { id: "sale_1" } });
      expect(res.status).toBe(401);
    });

    it("returns 403 when user lacks returns permission", async () => {
      mocks.mutation.mockRejectedValue(new Error("FORBIDDEN: User lacks MANAGE_SALES_RETURNS"));
      const req = new NextRequest("http://localhost/api/sales/sale_1/void", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Customer changed mind", tenderReversalConfirmed: true }),
      });
      const res = await POST_VOID(req, { params: { id: "sale_1" } });
      expect(res.status).toBe(403);
    });

    it("returns 400 when settlement confirmation or reference is missing", async () => {
      mocks.mutation.mockRejectedValue(
        new Error("SETTLEMENT_REQUIRED: Card reversals require an external reference"),
      );
      const req = new NextRequest("http://localhost/api/sales/sale_1/void", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Wrong amount", tenderReversalConfirmed: true }),
      });
      const res = await POST_VOID(req, { params: { id: "sale_1" } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Card reversals require an external reference");
    });

    it("successfully voids an order", async () => {
      mocks.mutation.mockResolvedValue({
        saleId: "sale_1",
        status: "VOIDED",
        restoredAllocations: 2,
      });
      const req = new NextRequest("http://localhost/api/sales/sale_1/void", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reason: "Entry error",
          tenderReversalConfirmed: true,
          externalReference: "ext-123",
        }),
      });
      const res = await POST_VOID(req, { params: { id: "sale_1" } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        success: true,
        saleId: "sale_1",
        status: "VOIDED",
        restoredAllocations: 2,
      });
    });
  });

  describe("refund route", () => {
    it("returns 400 when disposition is invalid", async () => {
      const req = new NextRequest("http://localhost/api/sales/sale_1/refund", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Broken box", disposition: "invalid_choice" }),
      });
      const res = await POST_REFUND(req, { params: { id: "sale_1" } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("disposition ('restock' or 'scrap') is required");
    });

    it("successfully refunds an order with restock disposition", async () => {
      mocks.mutation.mockResolvedValue({
        saleId: "sale_1",
        status: "REFUNDED",
        disposition: "restock",
        restoredAllocations: 1,
      });
      const req = new NextRequest("http://localhost/api/sales/sale_1/refund", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reason: "Product returned unopened",
          disposition: "restock",
          tenderRefundConfirmed: true,
        }),
      });
      const res = await POST_REFUND(req, { params: { id: "sale_1" } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        success: true,
        saleId: "sale_1",
        status: "REFUNDED",
        disposition: "restock",
        restoredAllocations: 1,
      });
    });

    it("successfully refunds an order with scrap disposition", async () => {
      mocks.mutation.mockResolvedValue({
        saleId: "sale_1",
        status: "REFUNDED",
        disposition: "scrap",
        restoredAllocations: 0,
      });
      const req = new NextRequest("http://localhost/api/sales/sale_1/refund", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reason: "Damaged cart",
          disposition: "scrap",
          tenderRefundConfirmed: true,
          externalReference: "card-ref-777",
        }),
      });
      const res = await POST_REFUND(req, { params: { id: "sale_1" } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        success: true,
        saleId: "sale_1",
        status: "REFUNDED",
        disposition: "scrap",
        restoredAllocations: 0,
      });
    });
  });
});
