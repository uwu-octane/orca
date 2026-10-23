import { z } from "zod";
import { beforeEach, expect, it, vi } from "vitest";
import { createSamModel, gatewayCostUsd } from "./samModel";
import { AppError } from "@/server/lib/errors";

const mocks = vi.hoisted(() => ({ config: vi.fn(), recordUse: vi.fn() }));
vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("@/db", () => ({ withPgClient: (fn: () => unknown) => fn() }));
vi.mock("@/server/features/ai/AiProviderConfigService", () => ({
  AiProviderConfigService: {
    resolve: mocks.config,
    recordUse: mocks.recordUse,
  },
}));
const scope = { projectId: "project-1", organizationId: "org-1" };
const params = {
  prompt: [
    {
      role: "user" as const,
      content: [{ type: "text" as const, text: "Hello" }],
    },
  ],
  providerOptions: {
    gateway: { only: ["other-provider"], models: ["other-model"] },
  },
};
function events(chunks: unknown[]) {
  return new Response(
    chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join(""),
    { headers: { "content-type": "text/event-stream" } },
  );
}
beforeEach(() => {
  mocks.config.mockResolvedValue({
    apiKey: "saved-project-key",
    timeoutMs: 60_000,
    revision: "r1",
  });
  mocks.recordUse.mockResolvedValue(undefined);
  vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
    events([{ type: "text-delta", id: "t", delta: "Hello" }]),
  );
});

it("resolves SAM's project connection lazily and pins the provider on streamed requests", async () => {
  const resolveScope = vi.fn(async () => scope);
  const model = createSamModel(resolveScope, "deepseek/deepseek-v4.1-flash");
  expect(mocks.config).not.toHaveBeenCalled();
  const { stream } = await model.doStream(params);
  expect(await stream.getReader().read()).toMatchObject({
    value: { type: "text-delta", delta: "Hello" },
  });
  expect(mocks.config).toHaveBeenCalledWith(scope, "vercel_gateway");
  const [url, init] = vi.mocked(fetch).mock.calls[0];
  expect(url).toBe("https://ai-gateway.vercel.sh/v3/ai/language-model");
  expect(new Headers(init?.headers).get("authorization")).toBe(
    "Bearer saved-project-key",
  );
  expect(JSON.parse(z.string().parse(init?.body))).toMatchObject({
    providerOptions: { gateway: { only: ["deepseek"], models: [] } },
  });
  expect(init?.redirect).toBe("manual");
});

it("refuses a rotated or removed key before sending the next model request", async () => {
  mocks.recordUse.mockRejectedValue(new AppError("CONFLICT"));
  await expect(
    createSamModel(async () => scope).doStream(params),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(fetch).not.toHaveBeenCalled();
});

it.each(["error-part", "broken-stream"])(
  "redacts upstream details from a %s before chat persistence",
  async (mode) => {
    vi.mocked(fetch).mockImplementation(async () =>
      mode === "error-part"
        ? events([{ type: "error", error: "sensitive-provider-response" }])
        : new Response("data: sensitive-provider-response\n\n", {
            headers: { "content-type": "text/event-stream" },
          }),
    );
    const { stream } = await createSamModel(async () => scope).doStream(params);
    const read = stream.getReader().read();
    if (mode === "error-part") {
      expect(await read).toMatchObject({
        value: { type: "error", error: { message: "AI_MODEL_REQUEST_FAILED" } },
      });
    } else {
      await expect(read).rejects.toMatchObject({
        message: "AI_MODEL_REQUEST_FAILED",
      });
    }
  },
);

it("reports a configured request timeout without leaking the transport error", async () => {
  vi.mocked(fetch).mockRejectedValue(
    new DOMException("sensitive-url", "TimeoutError"),
  );
  await expect(
    createSamModel(async () => scope).doStream(params),
  ).rejects.toMatchObject({ code: "AI_MODEL_TIMEOUT" });
});

it("does not report missing Gateway costs as free usage", () => {
  expect(gatewayCostUsd({ gateway: { cost: "0.002" } })).toBe(0.002);
  expect(gatewayCostUsd(undefined)).toBeNull();
});
