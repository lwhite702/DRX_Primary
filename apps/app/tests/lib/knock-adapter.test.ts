import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DRX_P0_WORKFLOW_KEYS,
  triggerDrxKnockWorkflow,
} from "@/lib/adapters/notifications/knock";

describe("DRX Knock notification adapter", () => {
  beforeEach(() => {
    delete process.env.KNOCK_API_KEY;
    delete process.env.KNOCK_NOTIFICATIONS_ENABLED;
  });

  it("stays disabled until the runtime explicitly enables it", async () => {
    const fetchMock = vi.fn();

    await expect(
      triggerDrxKnockWorkflow(
        {
          workflow: DRX_P0_WORKFLOW_KEYS.newLogin,
          recipientId: "user_test",
          data: { workspace_id: "workspace_test" },
        },
        { fetchImpl: fetchMock },
      ),
    ).resolves.toEqual({ status: "disabled" });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("triggers a P0 workflow with a structured payload", async () => {
    process.env.KNOCK_API_KEY = "knock_test_key";
    process.env.KNOCK_NOTIFICATIONS_ENABLED = "true";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ workflow_run_id: "run_test" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      triggerDrxKnockWorkflow(
        {
          workflow: DRX_P0_WORKFLOW_KEYS.importFailed,
          recipientId: "user_test",
          actorId: "user_actor_test",
          cancellationKey: "import_test",
          idempotencyKey: "request_test",
          data: {
            workspace_id: "workspace_test",
            import_id: "import_test",
            row_count: 4,
          },
        },
        { fetchImpl: fetchMock },
      ),
    ).resolves.toEqual({ status: "triggered", workflowRunId: "run_test" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.knock.app/v1/workflows/drx-import-failed/trigger",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer knock_test_key",
          "Content-Type": "application/json",
          "Idempotency-Key": "request_test",
        },
        body: JSON.stringify({
          recipients: ["user_test"],
          data: {
            workspace_id: "workspace_test",
            import_id: "import_test",
            row_count: 4,
          },
          actor: "user_actor_test",
          cancellation_key: "import_test",
        }),
      }),
    );
  });

  it("does not expose a provider response body on failure", async () => {
    process.env.KNOCK_API_KEY = "knock_test_key";
    process.env.KNOCK_NOTIFICATIONS_ENABLED = "true";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ secret: "provider detail" }), {
        status: 401,
      }),
    );

    await expect(
      triggerDrxKnockWorkflow(
        {
          workflow: DRX_P0_WORKFLOW_KEYS.authChange,
          recipientId: "user_test",
          data: { workspace_id: "workspace_test" },
        },
        { fetchImpl: fetchMock },
      ),
    ).rejects.toThrow("Knock workflow trigger failed with status 401.");
  });
});
