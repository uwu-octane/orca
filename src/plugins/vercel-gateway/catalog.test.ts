import { beforeAll, afterAll, beforeEach, expect, it, vi } from "vitest";
import { createAiTestRuntime } from "@/plugins/ai/server/testRuntime";
import type { Context } from "cordis";
let runtime: Context;
vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("@/db", () => ({}));
beforeAll(async () => {
  runtime = await createAiTestRuntime();
});
afterAll(async () => {
  await runtime?.fiber.dispose();
});

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async () => Response.json({ data: [] }));
});

function model(overrides: Record<string, unknown> = {}) {
  return {
    id: "deepseek/text-model",
    name: "Text model",
    owned_by: "deepseek",
    type: "language",
    ...overrides,
  };
}

it("lists text and decision models with prices per million tokens and provider metadata", async () => {
  fetchMock.mockResolvedValue(
    Response.json({
      data: [
        model({
          pricing: { input: "0.000000075", output: "0.0000003" },
          context_window: 1048576,
          released: 1788825600,
          tags: ["reasoning", "structured-output"],
          zdr: "some",
          no_training: "all",
        }),
        model({
          id: "typesafe-ai/jev",
          type: "evaluation",
          owned_by: "typesafe-ai",
        }),
        model({
          id: "openai/gpt-6-luna-decisions",
          name: "GPT-6 Luna Decisions",
          type: "evaluation",
          owned_by: "openai",
          pricing: { input: "0.0000001", output: "0" },
        }),
        model({ id: "openai/gpt-6-luna", owned_by: "openai" }),
        { type: "image", id: "image-model" },
      ],
    }),
  );
  const models = await runtime.ai.listModels("vercel_gateway");
  expect(models).toHaveLength(4);
  expect(models[0]).toMatchObject({
    id: "deepseek/text-model",
    kind: "language",
    creator: "deepseek",
    inputPrice: 0.075,
    outputPrice: 0.3,
    contextWindow: 1048576,
    released: 1788825600000,
    capabilities: ["reasoning", "structured-output"],
    zeroDataRetention: "some",
    noTraining: "all",
  });
  expect(models[1]).toMatchObject({
    id: "typesafe-ai/jev",
    kind: "evaluation",
  });
  expect(models[2]).toMatchObject({
    id: "openai/gpt-6-luna-decisions",
    kind: "evaluation",
    creator: "openai",
    outputPrice: 0,
  });
  expect(models[2].inputPrice).toBeCloseTo(0.1);
  expect(models[3]).toMatchObject({
    id: "openai/gpt-6-luna",
    kind: "language",
  });
  // Discovery must stay on the public catalog, without forwarding credentials
  // or following a redirect to a different host.
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe("https://ai-gateway.vercel.sh/v1/models");
  expect(new Headers(options?.headers).has("Authorization")).toBe(false);
  expect(options?.redirect).toBe("manual");
});

it("distinguishes free models from unavailable pricing and policy information", async () => {
  fetchMock.mockResolvedValue(
    Response.json({
      data: [
        model({
          id: "free",
          pricing: { input: "0", output: "0" },
          zdr: "none",
        }),
        model({ id: "unknown", pricing: { input: "0.000001" } }),
      ],
    }),
  );
  expect(await runtime.ai.listModels("vercel_gateway")).toMatchObject([
    { id: "free", inputPrice: 0, outputPrice: 0, zeroDataRetention: "none" },
    {
      id: "unknown",
      inputPrice: 1,
      outputPrice: null,
      zeroDataRetention: null,
      released: null,
    },
  ]);
});

it.each([
  { label: "redirect", status: 302, body: "private upstream detail" },
  { label: "service failure", status: 503, body: "private upstream detail" },
  { label: "invalid catalog", status: 200, body: '{"data":null}' },
  {
    label: "invalid pricing",
    status: 200,
    body: JSON.stringify({
      data: [model({ pricing: { input: "not-a-price" } })],
    }),
  },
])(
  "reports $label without leaking upstream responses or substituting models",
  async ({ status, body }) => {
    fetchMock.mockResolvedValue(new Response(body, { status }));
    await expect(runtime.ai.listModels("vercel_gateway")).rejects.toMatchObject(
      {
        code: "AI_MODEL_CATALOG_UNAVAILABLE",
        message: "AI_MODEL_CATALOG_UNAVAILABLE",
      },
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  },
);
