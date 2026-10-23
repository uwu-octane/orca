import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Context } from "cordis";
import { tool } from "ai";
import { z } from "zod";
import { createAiTestRuntime } from "@/plugins/ai/server/testRuntime";
import { makeToolContext } from "@/server/mcp/tools/tool-test-support";
import { DEFAULT_LLM_MODEL } from "@/types/schemas/ai-provider";
import SamService from ".";

vi.mock("cloudflare:workers", () => ({
  env: {},
  DurableObject: class {
    kind = "mock";
  },
}));
vi.mock("@/db", () => ({ withPgClient: (fn: () => unknown) => fn() }));
vi.mock("@/plugins/ai/server/configuration", () => ({
  configuration: {
    resolve: async () => ({
      apiKey: "test-key",
      timeoutMs: 60000,
      revision: "r1",
    }),
    recordUse: async () => {},
  },
}));

let ctx: Context;
let removeSam: () => Promise<void>;
const context = {
  auth: makeToolContext().auth,
  project: { id: "project-1", domain: "example.com" },
};
const options = { toolCallId: "t", messages: [] };
beforeEach(async () => {
  ctx = await createAiTestRuntime();
  const sam = ctx.plugin(SamService);
  await sam;
  removeSam = async () => {
    await sam.dispose();
  };
});
afterEach(async () => {
  await ctx?.fiber.dispose();
});

it("withdraws a contributed tool and aborts its active execution with its owning plugin", async () => {
  let signal: AbortSignal | undefined;
  const contributor = ctx.plugin({
    inject: ["sam"],
    apply(scope: Context) {
      scope.sam.registerTool("domain_research", () =>
        tool({
          inputSchema: z.object({}),
          execute: (_input, call) =>
            new Promise((_resolve, reject) => {
              signal = call.abortSignal;
              signal?.addEventListener("abort", () => reject(signal?.reason), {
                once: true,
              });
            }),
        }),
      );
    },
  });
  await contributor;
  const tools = await ctx.sam.buildTools(context);
  const pending: unknown = tools.domain_research.execute!({}, options);
  const rejected = expect(pending).rejects.toThrow(/not registered/);
  await contributor.dispose();
  await rejected;
  expect(signal?.aborted).toBe(true);
  expect(() => {
    tools.domain_research.execute!({}, options);
  }).toThrow(/not registered/);
  expect(await ctx.sam.buildTools(context)).not.toHaveProperty(
    "domain_research",
  );
});

it("builds tool instances for each request's project without retaining another project's context", async () => {
  ctx.sam.registerTool("current_project", ({ project }) =>
    tool({
      inputSchema: z.object({}),
      execute: async () => ({ projectId: project.id }),
    }),
  );
  const first = await ctx.sam.buildTools(context);
  const second = await ctx.sam.buildTools({
    ...context,
    project: { ...context.project, id: "project-2" },
  });
  expect(await second.current_project.execute!({}, options)).toEqual({
    projectId: "project-2",
  });
  expect(await first.current_project.execute!({}, options)).toEqual({
    projectId: "project-1",
  });
});

it("aborts SAM inference on unload while leaving the AI service installed", async () => {
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  let signal: AbortSignal | null | undefined;
  vi.spyOn(globalThis, "fetch").mockImplementation(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        signal = init?.signal;
        signal?.addEventListener("abort", () => reject(signal?.reason), {
          once: true,
        });
        markStarted();
      }),
  );
  const sam = ctx.sam;
  const model = await sam.languageModel(
    { projectId: "project-1", organizationId: "org-1" },
    DEFAULT_LLM_MODEL,
  );
  const pending = expect(model.doStream({ prompt: [] })).rejects.toMatchObject({
    code: "AI_MODEL_REQUEST_FAILED",
  });
  await started;
  await removeSam();
  await pending;
  expect(signal?.aborted).toBe(true);
  expect(ctx.get("ai")).toBeDefined();
  expect(ctx.get("sam")).toBeUndefined();
  await expect(model.doStream({ prompt: [] })).rejects.toThrow(/not active/);
  await expect(sam.buildTools(context)).rejects.toThrow(/not active/);
  expect(fetch).toHaveBeenCalledTimes(1);
});
