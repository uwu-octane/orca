import KeywordsService from "@/plugins/keywords/server";
import { createAiTestRuntime } from "@/plugins/ai/server/testRuntime";
import type { Context } from "cordis";
let runtime: Context;
vi.mock("@/plugins/server/context", () => ({
  getAi: async () => runtime.ai,
}));
import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { z } from "zod";
import { keywordDimensionTool } from "@/plugins/keywords/server/dimensions/sam-tool";
import { AppError } from "@/server/lib/errors";
import type {
  GenerateKeywordDimensionsInput,
  keywordDimensionsSchema,
} from "@/types/schemas/keyword-dimensions";

const mocks = vi.hoisted(() => ({
  project: vi.fn(),
  config: vi.fn(),
  recordUse: vi.fn(),
}));
vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("@/db", () => ({ withPgClient: (fn: () => unknown) => fn() }));
vi.mock("@/server/features/projects/repositories/ProjectRepository", () => ({
  ProjectRepository: { getProjectForOrganization: mocks.project },
}));
vi.mock("@/plugins/ai/server/configuration", () => ({
  createConfiguration: () => ({
    resolve: mocks.config,
    recordUse: mocks.recordUse,
  }),
}));

const input: GenerateKeywordDimensionsInput = {
  projectId: "project-1",
  language: "zh",
  model: "deepseek/deepseek-v4-flash",
  keywords: ["espresso machine", "commercial coffee maker"],
};
const context = {
  projectId: "project-1",
  organizationId: "org-1",
};
const fields: z.infer<typeof keywordDimensionsSchema> = {
  dimensions: [
    {
      name: "Equipment",
      labelZh: "设备类型",
      children: [
        { name: "Espresso machines", labelZh: "意式咖啡机" },
        { name: "Coffee makers", labelZh: "咖啡机" },
      ],
    },
  ],
};
function completion(output = fields, finishReason = "tool-calls") {
  return Response.json({
    content: [
      {
        type: "tool-call",
        toolCallId: "submit-1",
        toolName: "submit_keyword_dimensions",
        input: JSON.stringify(output),
      },
    ],
    finishReason: { unified: finishReason, raw: finishReason },
    usage: {
      inputTokens: { total: 20, noCache: 20, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 10, text: 10, reasoning: 0 },
    },
  });
}
beforeEach(() => {
  mocks.recordUse.mockResolvedValue(undefined);
  mocks.project.mockResolvedValue({ id: "project-1" });
  mocks.config.mockResolvedValue({
    apiKey: "project-gateway-key",
    timeoutMs: 60000,
    revision: "config-revision",
  });
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => completion());
});

describe("keyword field generation", () => {
  it("returns English names with Chinese labels through the project's selected Gateway model", async () => {
    expect(await runtime.keywords.generateDimensions(input, context)).toEqual(
      fields,
    );
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      "https://ai-gateway.vercel.sh/v3/ai/language-model",
    );
    const headers = new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers);
    expect(headers.get("authorization")).toBe("Bearer project-gateway-key");
    expect(headers.get("ai-language-model-id")).toBe(
      "deepseek/deepseek-v4-flash",
    );
    expect(
      JSON.parse(z.string().parse(vi.mocked(fetch).mock.calls[0][1]?.body)),
    ).toMatchObject({
      maxOutputTokens: 16_000,
      providerOptions: { gateway: { only: ["deepseek"], models: [] } },
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("binds SAM's internal dimension tool to its session project", async () => {
    const samTool = keywordDimensionTool(context, (request, scope, signal) =>
      runtime.keywords.generateDimensions(request, scope, signal),
    );
    const payload = { ...input, projectId: "other-project" };
    expect(
      await samTool.execute?.(payload, { toolCallId: "t", messages: [] }),
    ).toEqual(fields);
    expect(mocks.project).toHaveBeenCalledWith("project-1", "org-1");
    expect(mocks.config).toHaveBeenCalledWith(context, "vercel_gateway");
  });

  it("denies inaccessible projects before making a paid call", async () => {
    mocks.project.mockResolvedValue(null);
    await expect(
      runtime.keywords.generateDimensions(input, context),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires saved configuration instead of using a deployment key or another provider", async () => {
    mocks.config.mockRejectedValue(new AppError("AI_PROVIDER_NOT_CONFIGURED"));
    await expect(
      runtime.keywords.generateDimensions(input, context),
    ).rejects.toMatchObject({ code: "AI_PROVIDER_NOT_CONFIGURED" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["name", "labelZh"] as const)(
    "rejects duplicate %s without generating replacements",
    async (key) => {
      const dimension = fields.dimensions[0];
      vi.mocked(fetch).mockImplementation(async () =>
        completion({
          dimensions: [
            {
              ...dimension,
              children: [
                dimension.children[0],
                {
                  ...dimension.children[1],
                  [key]: dimension.children[0][key].toUpperCase(),
                },
              ],
            },
          ],
        }),
      );
      await expect(
        runtime.keywords.generateDimensions(input, context),
      ).rejects.toMatchObject({ code: "KEYWORD_DIMENSIONS_INVALID_RESPONSE" });
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );

  it("rejects Chinese canonical names even for Chinese UI requests", async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      completion({
        dimensions: [{ ...fields.dimensions[0], name: "设备类型" }],
      }),
    );
    await expect(
      runtime.keywords.generateDimensions(input, context),
    ).rejects.toMatchObject({ code: "KEYWORD_DIMENSIONS_INVALID_RESPONSE" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not accept a truncated generation even when its JSON is complete", async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      completion(fields, "length"),
    );
    await expect(
      runtime.keywords.generateDimensions(input, context),
    ).rejects.toMatchObject({ code: "KEYWORD_DIMENSIONS_OUTPUT_LIMIT" });
  });

  it("reports reasoning-only exhaustion without accepting empty fields", async () => {
    vi.mocked(fetch).mockImplementation(async () => {
      const body = z
        .record(z.string(), z.unknown())
        .parse(await completion(fields, "length").json());
      return Response.json({
        ...body,
        content: [{ type: "reasoning", text: "Planning" }],
      });
    });
    await expect(
      runtime.keywords.generateDimensions(input, context),
    ).rejects.toMatchObject({ code: "KEYWORD_DIMENSIONS_OUTPUT_LIMIT" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("requires a validated submission instead of accepting a prose-only reply", async () => {
    vi.mocked(fetch).mockImplementation(async () => {
      const body = z
        .record(z.string(), z.unknown())
        .parse(await completion(fields, "stop").json());
      return Response.json({
        ...body,
        content: [{ type: "text", text: "Here are some ideas" }],
      });
    });
    await expect(
      runtime.keywords.generateDimensions(input, context),
    ).rejects.toMatchObject({ code: "KEYWORD_DIMENSIONS_INVALID_RESPONSE" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    [302, "AI_MODEL_REQUEST_FAILED"],
    [401, "KEYWORD_DIMENSIONS_ACCESS_FAILED"],
    [402, "KEYWORD_DIMENSIONS_PROVIDER_CREDITS_EXHAUSTED"],
    [403, "KEYWORD_DIMENSIONS_ACCESS_FAILED"],
    [429, "RATE_LIMITED"],
    [503, "AI_MODEL_REQUEST_FAILED"],
  ])(
    "maps provider status %i without retrying, switching models or exposing its body",
    async (status, code) => {
      vi.mocked(fetch).mockImplementation(async () =>
        Response.json(
          { error: { message: "sensitive-provider-detail" } },
          { status },
        ),
      );
      await expect(
        runtime.keywords.generateDimensions(input, context),
      ).rejects.toMatchObject({
        code,
        message: code,
      });
      expect(fetch).toHaveBeenCalledTimes(1);
      const body: unknown = JSON.parse(
        z.string().parse(vi.mocked(fetch).mock.calls[0][1]?.body),
      );
      expect(body).toMatchObject({
        providerOptions: { gateway: { only: ["deepseek"], models: [] } },
      });
    },
  );
});

beforeAll(async () => {
  runtime = await createAiTestRuntime();
  await runtime.plugin(KeywordsService);
});
afterAll(async () => {
  await runtime?.fiber.dispose();
});
