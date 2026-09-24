import "server-only";

const KNOCK_API_BASE_URL = "https://api.knock.app/v1";

export const DRX_P0_WORKFLOW_KEYS = {
  newLogin: "drx-security-new-login",
  authChange: "drx-security-auth-change",
  teamInvited: "drx-team-invited",
  teamAccessChanged: "drx-team-access-changed",
  saleRecoveryRequired: "drx-sale-recovery-required",
  importFailed: "drx-import-failed",
} as const;

export type DrxP0WorkflowKey =
  (typeof DRX_P0_WORKFLOW_KEYS)[keyof typeof DRX_P0_WORKFLOW_KEYS];

type KnockJsonValue =
  | string
  | number
  | boolean
  | null
  | KnockJsonValue[]
  | { [key: string]: KnockJsonValue };

export type KnockWorkflowData = Record<string, KnockJsonValue>;

export type KnockTriggerInput = {
  workflow: DrxP0WorkflowKey;
  recipientId: string;
  data: KnockWorkflowData;
  actorId?: string;
  cancellationKey?: string;
  idempotencyKey?: string;
};

export type KnockTriggerResult =
  | { status: "disabled" }
  | { status: "triggered"; workflowRunId?: string };

type KnockTriggerResponse = {
  workflow_run_id?: unknown;
};

type TriggerOptions = {
  fetchImpl?: typeof fetch;
};

const P0_WORKFLOW_KEY_SET = new Set<DrxP0WorkflowKey>(
  Object.values(DRX_P0_WORKFLOW_KEYS),
);

function isKnockEnabled(): boolean {
  return process.env.KNOCK_NOTIFICATIONS_ENABLED === "true";
}

function requireValidInput(input: KnockTriggerInput): void {
  if (!P0_WORKFLOW_KEY_SET.has(input.workflow)) {
    throw new Error("Unsupported DRX P0 Knock workflow key.");
  }

  if (!input.recipientId.trim()) {
    throw new Error("A Knock recipient ID is required.");
  }
}

/**
 * Trigger a reviewed DRX P0 workflow without exposing Knock credentials to the
 * browser. The adapter is disabled unless explicitly enabled in the runtime.
 */
export async function triggerDrxKnockWorkflow(
  input: KnockTriggerInput,
  options: TriggerOptions = {},
): Promise<KnockTriggerResult> {
  requireValidInput(input);

  if (!isKnockEnabled()) {
    return { status: "disabled" };
  }

  const apiKey = process.env.KNOCK_API_KEY?.trim();
  if (!apiKey) {
    return { status: "disabled" };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  if (input.idempotencyKey) {
    headers["Idempotency-Key"] = input.idempotencyKey;
  }

  const body: Record<string, unknown> = {
    recipients: [input.recipientId],
    data: input.data,
  };

  if (input.actorId) {
    body.actor = input.actorId;
  }

  if (input.cancellationKey) {
    body.cancellation_key = input.cancellationKey;
  }

  const response = await (options.fetchImpl ?? fetch)(
    `${KNOCK_API_BASE_URL}/workflows/${encodeURIComponent(input.workflow)}/trigger`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new Error(`Knock workflow trigger failed with status ${response.status}.`);
  }

  let responseBody: KnockTriggerResponse = {};
  try {
    responseBody = (await response.json()) as KnockTriggerResponse;
  } catch {
    // Knock may return an empty success body. The request still completed.
  }

  return {
    status: "triggered",
    workflowRunId:
      typeof responseBody.workflow_run_id === "string"
        ? responseBody.workflow_run_id
        : undefined,
  };
}
