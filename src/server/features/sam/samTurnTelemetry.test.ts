import { describe, expect, it, vi } from "vitest";
import type { StepContext, ToolCallResultContext } from "@cloudflare/think";
import {
  SamTelemetry,
  SamTurnStats,
} from "@/server/features/sam/samTurnTelemetry";
import { captureServerEvent } from "@/server/lib/posthog";

vi.mock("@/server/lib/posthog", () => ({
  captureServerEvent: vi.fn(),
  captureServerError: vi.fn(),
}));

const step = (overrides: Record<string, unknown> = {}) =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- only the fields recordStep reads
  ({
    response: { modelId: "deepseek/deepseek-v4.1-flash" },
    usage: {
      inputTokens: 1000,
      outputTokens: 200,
      inputTokenDetails: { cacheReadTokens: 400 },
      outputTokenDetails: { reasoningTokens: 150 },
    },
    toolCalls: [{ toolName: "research_keywords" }],
    finishReason: "tool-calls",
    ...overrides,
  }) as unknown as StepContext;

const toolCall = (overrides: Record<string, unknown> = {}) =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- only the fields recordToolCall reads
  ({
    toolName: "research_keywords",
    success: true,
    output: { summary: "ok" },
    toolExecutionMs: 120,
    ...overrides,
  }) as unknown as ToolCallResultContext;

describe("SamTurnStats", () => {
  it("sums steps and tool calls into the turn event, counting {error} outputs as failures", () => {
    const stats = new SamTurnStats();
    // Each generation is linked to the turn as its trace.
    expect(stats.recordStep(step(), 0.01)).toMatchObject({
      $ai_trace_id: stats.turnId,
      $ai_parent_id: stats.turnId,
      $ai_model: "deepseek/deepseek-v4.1-flash",
    });
    stats.recordStep(step({ toolCalls: [], finishReason: "stop" }), 0.02);
    stats.recordSpend(0.03);
    stats.recordToolCall(toolCall());
    stats.recordToolCall(
      toolCall({ toolName: "read_pages", output: { error: "blocked" } }),
    );
    stats.recordToolCall(toolCall({ success: false, error: new Error("x") }));

    expect(stats.properties("completed")).toMatchObject({
      turn_id: stats.turnId,
      status: "completed",
      model: "deepseek/deepseek-v4.1-flash",
      steps: 2,
      input_tokens: 2000,
      output_tokens: 400,
      reasoning_tokens: 300,
      cached_input_tokens: 800,
      cost_usd: 0.03,
      tool_calls: 3,
      tool_failures: 2,
      tools: ["research_keywords", "read_pages"],
      tool_ms: 360,
    });
    expect(stats.traceProperties("error", "boom")).toMatchObject({
      $ai_trace_id: stats.turnId,
      $ai_is_error: true,
      $ai_error: "boom",
    });
  });
});

describe("SamTelemetry turn completion", () => {
  it.each(["completed", "error"] as const)(
    "reports a %s turn once with its own cost while another turn starts",
    async (outcome) => {
      const pending: Promise<unknown>[] = [];
      let finishIdentity!: () => void;
      const identityReady = new Promise<void>((resolve) => {
        finishIdentity = resolve;
      });
      const telemetry = new SamTelemetry(
        () => "session-1",
        async () => {
          await identityReady;
          return {
            row: { userId: "user-1" },
            project: { id: "project-1", organizationId: "org-1" },
          };
        },
        (promise) => {
          pending.push(promise);
        },
      );
      const first = telemetry.beginTurn(false);
      first.recordStep(step(), 0.01);
      first.recordSpend(0.01);
      if (outcome === "error") {
        telemetry.error(new Error("failed"), undefined, []);
      } else {
        pending.push(telemetry.report(outcome, {}, []));
      }
      await telemetry.report(outcome, {}, []);
      expect(captureServerEvent).not.toHaveBeenCalled();

      const second = telemetry.beginTurn(false);
      second.recordSpend(0.99);
      finishIdentity();
      await Promise.all(pending);

      const events = vi
        .mocked(captureServerEvent)
        .mock.calls.map(([event]) => event);
      const turns = events.filter((event) => event.event === "sam:turn");
      expect(turns).toHaveLength(1);
      expect(turns[0]?.properties).toMatchObject({
        turn_id: first.turnId,
        status: outcome,
        cost_usd: 0.01,
      });
      expect(
        events.find((event) => event.event === "$ai_trace")?.properties,
      ).toMatchObject({ $ai_trace_id: first.turnId, status: outcome });
      expect(second.reported).toBe(false);
    },
  );
});
