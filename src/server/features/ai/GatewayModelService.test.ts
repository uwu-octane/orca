import { beforeEach, expect, it, vi } from "vitest";
import { GatewayModelService } from "./GatewayModelService";

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
        { type: "image", id: "image-model" },
      ],
    }),
  );
  const models = await GatewayModelService.list();
  expect(models).toHaveLength(2);
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
  expect(await GatewayModelService.list()).toMatchObject([
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
    await expect(GatewayModelService.list()).rejects.toMatchObject({
      code: "AI_MODEL_CATALOG_UNAVAILABLE",
      message: "AI_MODEL_CATALOG_UNAVAILABLE",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  },
);
