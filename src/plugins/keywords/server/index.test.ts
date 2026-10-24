import { Context } from "cordis";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AiService from "@/plugins/ai/server";
import * as gateway from "@/plugins/vercel-gateway";
import SamService from "@/plugins/sam/server";
import { makeToolContext } from "@/server/mcp/tools/tool-test-support";
import KeywordsService from ".";

const projectAccess = vi.hoisted(() => vi.fn(async () => ({ id: "p1" })));

vi.mock("cloudflare:workers", () => ({
  env: {},
  waitUntil: (work: Promise<unknown>) => work,
  DurableObject: class {
    kind = "mock";
  },
}));
vi.mock("@/db", () => ({ withPgClient: (fn: () => unknown) => fn() }));
vi.mock("@/plugins/server/context", () => ({
  getKeywords: () => {
    throw new Error("Unexpected global keyword lookup");
  },
}));
vi.mock("@/server/features/projects/services/ProjectService", () => ({
  ProjectService: { getProjectForOrganization: projectAccess },
}));
vi.mock("@/server/lib/posthog", () => ({
  captureServerEvent: async () => {},
  captureServerError: async () => {},
}));
vi.mock("@/server/lib/self-host-telemetry", () => ({
  incrementSelfHostMcpToolCallCount: async () => {},
}));
vi.mock("@/server/features/projects/repositories/ProjectRepository", () => ({
  ProjectRepository: { getProjectForOrganization: async () => ({ id: "p1" }) },
}));
vi.mock("@/plugins/ai/server/configuration", () => ({
  createConfiguration: () => ({
    resolve: async () => ({
      apiKey: "test-key",
      timeoutMs: 60000,
      revision: "r1",
    }),
    recordUse: async () => {},
  }),
}));
let ctx: Context;
const scope = { projectId: "p1", organizationId: "org_1" };
const input = {
  projectId: "p1",
  keywords: ["coffee"],
  language: "en" as const,
};
const context = {
  auth: makeToolContext().auth,
  project: { id: "p1", domain: null },
};
beforeEach(() => {
  ctx = new Context();
  projectAccess.mockResolvedValue({ id: "p1" });
});
afterEach(async () => {
  await ctx.fiber.dispose();
});

it("activates without suppliers and refuses unavailable generation without a network request", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch");
  await ctx.plugin(KeywordsService);
  await expect(
    ctx.keywords.generateDimensions(input, scope),
  ).rejects.toMatchObject({ code: "AI_PROVIDER_NOT_CONFIGURED" });
  expect(fetchMock).not.toHaveBeenCalled();
});

it("contributes tools when SAM arrives and withdraws them when Keywords is removed", async () => {
  const keywords = ctx.plugin(KeywordsService);
  await keywords;
  await ctx.plugin(AiService, { textProvider: "vercel_gateway" });
  await ctx.plugin(SamService);
  const tools = await ctx.sam.buildTools(context);
  expect(tools.research_keywords).toBeDefined();
  expect(tools.generate_keyword_dimensions).toBeDefined();
  await keywords.dispose();
  expect(await ctx.sam.buildTools(context)).not.toHaveProperty(
    "research_keywords",
  );
  expect(() => {
    tools.generate_keyword_dimensions.execute?.(input, {
      toolCallId: "t",
      messages: [],
    });
  }).toThrow(/not registered/);
});

it.each(["keywords", "ai"] as const)(
  "cancels an active generation when %s is removed",
  async (owner) => {
    const ai = ctx.plugin(AiService, { textProvider: "vercel_gateway" });
    await ai;
    await ctx.plugin(gateway);
    const keywords = ctx.plugin(KeywordsService);
    await keywords;
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
    const service = ctx.keywords;
    const pending = expect(
      service.generateDimensions(input, scope),
    ).rejects.toBeDefined();
    await started;
    await (owner === "ai" ? ai : keywords).dispose();
    await pending;
    expect(signal?.aborted).toBe(true);
    await expect(service.generateDimensions(input, scope)).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  },
);

it("executes contributed keyword tools in the registering context", async () => {
  await ctx.plugin(KeywordsService);
  await ctx.plugin(AiService, { textProvider: "vercel_gateway" });
  await ctx.plugin(SamService);
  vi.spyOn(ctx.keywords, "getSavedKeywords").mockResolvedValue({
    rows: [],
    totalCount: 0,
    tags: [],
  });
  const tools = await ctx.sam.buildTools(context);
  expect(
    await tools.list_saved_keywords.execute!(
      {},
      { toolCallId: "t", messages: [] },
    ),
  ).toMatchObject({ data: { rows: [], totalCount: 0 } });
});

it("does not dispatch a keyword tool after SAM is unloaded during authorization", async () => {
  await ctx.plugin(KeywordsService);
  await ctx.plugin(AiService, { textProvider: "vercel_gateway" });
  const sam = ctx.plugin(SamService);
  await sam;
  const readKeywords = vi
    .spyOn(ctx.keywords, "getSavedKeywords")
    .mockResolvedValue({
      rows: [],
      totalCount: 0,
      tags: [],
    });
  let beginAuthorization!: () => void;
  const authorizing = new Promise<void>((resolve) => {
    beginAuthorization = resolve;
  });
  let finishAuthorization!: () => void;
  const authorized = new Promise<void>((resolve) => {
    finishAuthorization = resolve;
  });
  projectAccess.mockImplementation(async () => {
    beginAuthorization();
    await authorized;
    return { id: "p1" };
  });
  const tools = await ctx.sam.buildTools(context);
  const pending: unknown = tools.list_saved_keywords.execute!(
    {},
    { toolCallId: "t", messages: [] },
  );
  await authorizing;
  await sam.dispose();
  finishAuthorization();
  await pending;
  expect(readKeywords).not.toHaveBeenCalled();
});
