import { typedDecisionFixture } from "./decision-test-fixtures";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import {
  AI_PROVIDERS,
  OPENAI_DECISION_MODEL,
  type SaveAiProviderConfig,
} from "@/types/schemas/ai-provider";
const TYPESAFE_DECISION_ENDPOINT = AI_PROVIDERS.typesafe.endpoint;
const VERCEL_GATEWAY_ENDPOINT = AI_PROVIDERS.vercel_gateway.endpoint;

import { type DecisionInput } from "@/types/schemas/decision";

import {
  database,
  initializeAiDatabase,
  resetAiDatabase,
} from "./testDatabase";
import { createAiTestRuntime } from "./testRuntime";
import type { Context } from "cordis";
let runtime: Context;
vi.mock("@/plugins/server/context", () => ({
  getAi: async () => runtime.ai,
}));

const mocks = vi.hoisted(() => ({
  fetch: vi.fn<typeof fetch>(),
  hosted: false,
  context: { organizationId: "org-1", projectId: "project-1", role: "owner" },
}));
vi.mock("@/db", async () => {
  const { database: fixture } = await import("./testDatabase");
  return { db: fixture.db, withPgClient: (fn: () => unknown) => fn() };
});
vi.mock("cloudflare:workers", () => ({ env: { DATABASE_PROVIDER: "d1" } }));
vi.mock("@/server/lib/runtime-env", () => ({
  getOptionalEnvValue: async (name: string) =>
    name === "BETTER_AUTH_SECRET"
      ? "test-decision-secret-at-least-32-characters"
      : undefined,
  isHostedServerAuthMode: async () => mocks.hosted,
}));
beforeAll(async () => {
  await initializeAiDatabase();
  runtime = await createAiTestRuntime();
});
afterAll(async () => {
  await runtime?.fiber.dispose();
  database.client.close();
});
beforeEach(async () => {
  await resetAiDatabase();
  mocks.hosted = false;
  mocks.context.role = "owner";
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.fetch.mockImplementation(async () =>
    Response.json({
      model: "jev-release",
      answers: { relevant: { type: "noul", noul: 0.8 } },
    }),
  );
});

function requestBody() {
  const body = mocks.fetch.mock.calls[0][1]?.body;
  if (typeof body !== "string") throw new Error("Expected a JSON request body");
  return body;
}

const scope = { organizationId: "org-1", projectId: "project-1" };
const input: DecisionInput = {
  state: "coffee beans",
  questions: {
    relevant: { type: "noul", instructions: "Is this about coffee?" },
  },
};
function config(
  overrides: Partial<SaveAiProviderConfig> = {},
): SaveAiProviderConfig {
  return {
    projectId: scope.projectId,
    provider: "typesafe",
    endpoint: TYPESAFE_DECISION_ENDPOINT,
    timeoutMs: 30_000,
    revision: null,
    credential: {
      action: "replace",
      name: "Research",
      value: "test-secret-key",
    },
    ...overrides,
  };
}

it.each([
  {
    provider: "typesafe",
    endpoint: "https://api.typesafe.ai/v1/systemone",
    model: "jev-latest",
  },
  {
    provider: "vercel_gateway",
    endpoint: VERCEL_GATEWAY_ENDPOINT,
    model: "typesafe-ai/jev",
  },
  {
    provider: "vercel_gateway",
    endpoint: VERCEL_GATEWAY_ENDPOINT,
    model: OPENAI_DECISION_MODEL,
  },
] as const)(
  "$provider / $model forwards typed questions unchanged and preserves distributions, model identity and usage",
  async (service) => {
    // Fixed cloud endpoints are available in hosted mode without custom-origin configuration.
    mocks.hosted = true;
    await runtime.ai.configuration.saveConfig(
      config({ provider: service.provider, endpoint: service.endpoint }),
      scope,
    );
    const { request, response } = typedDecisionFixture();
    response.model = service.model;
    if (service.model === OPENAI_DECISION_MODEL)
      response.usage.output_tokens = 0;
    mocks.fetch.mockResolvedValue(Response.json(response));
    const result = await runtime.ai.decide(request, scope, {
      provider: service.provider,
      model: service.model,
    });
    expect(mocks.fetch.mock.calls[0][0]).toBe(
      service.provider === "vercel_gateway"
        ? `${service.endpoint}/typesafe/v1/systemone`
        : service.endpoint,
    );
    expect(mocks.fetch.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: "Bearer test-secret-key",
    });
    expect(JSON.parse(requestBody())).toEqual({
      ...request,
      model: service.model,
      ...(service.model === OPENAI_DECISION_MODEL
        ? { providerOptions: { gateway: { only: ["openai"], models: [] } } }
        : {}),
    });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch.mock.calls[0][1]?.redirect).toBe("manual");
    expect(result).toMatchObject({
      ...response,
      provider: service.provider,
      requestedModel: service.model,
    });
  },
);

it("rejects an OpenAI text model before sending a paid decision request", async () => {
  await runtime.ai.configuration.saveConfig(
    config({
      provider: "vercel_gateway",
      endpoint: VERCEL_GATEWAY_ENDPOINT,
    }),
    scope,
  );
  await expect(
    runtime.ai.decide(input, scope, {
      provider: "vercel_gateway",
      model: "openai/gpt-6-luna",
    }),
  ).rejects.toMatchObject({ code: "DECISION_MODEL_UNSUPPORTED" });
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it("uses the explicitly configured local endpoint and model, with optional bearer auth and no invented usage", async () => {
  const endpoint = "http://127.0.0.1:8765/v1/systemone";
  await runtime.ai.configuration.saveConfig(
    config({
      provider: "systemone",
      endpoint,
      credential: { action: "clear" },
    }),
    scope,
  );
  mocks.fetch.mockResolvedValue(
    Response.json({
      model: "laya-english",
      answers: { relevant: { type: "noul", noul: 0.4 } },
    }),
  );
  const result = await runtime.ai.decide(input, scope, {
    provider: "systemone",
    model: "english",
  });
  expect(mocks.fetch.mock.calls[0][0]).toBe(endpoint);
  expect(mocks.fetch.mock.calls[0][1]).toMatchObject({ redirect: "manual" });
  expect(mocks.fetch.mock.calls[0][1]?.headers).not.toHaveProperty(
    "Authorization",
  );
  expect(JSON.parse(requestBody())).toMatchObject({
    model: "english",
  });
  expect(result).not.toHaveProperty("usage");
});

it.each([
  {},
  { wrong: { type: "noul", noul: 0.5 } },
  { relevant: { type: "noul", noul: 1.5 } },
  {
    relevant: {
      type: "choice",
      choice: "x",
      confidence: 1,
      probabilities: { x: 1 },
    },
  },
])("rejects incomplete or incorrectly typed answers", async (answers) => {
  await runtime.ai.configuration.saveConfig(config(), scope);
  mocks.fetch.mockResolvedValue(
    Response.json({ model: "jev-release", answers }),
  );
  await expect(
    runtime.ai.decide(input, scope, { provider: "typesafe" }),
  ).rejects.toMatchObject({
    code: "DECISION_INVALID_RESPONSE",
  });
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
});

it("rejects options not present in the caller's criteria", async () => {
  await runtime.ai.configuration.saveConfig(config(), scope);
  mocks.fetch.mockResolvedValue(
    Response.json({
      model: "jev-release",
      answers: {
        intent: {
          type: "choice",
          choice: "unknown",
          confidence: 1,
          probabilities: { unknown: 1 },
        },
      },
    }),
  );
  await expect(
    runtime.ai.decide(
      {
        state: "coffee",
        questions: {
          intent: {
            type: "choice",
            instructions: "Classify",
            criteria: { buy: "Buy", learn: "Learn" },
          },
        },
      },
      scope,
      { provider: "typesafe" },
    ),
  ).rejects.toMatchObject({ code: "DECISION_INVALID_RESPONSE" });
});

it("rejects reported truncation instead of treating a partial evaluation as complete", async () => {
  await runtime.ai.configuration.saveConfig(config(), scope);
  mocks.fetch.mockResolvedValue(
    Response.json({
      model: "laya",
      answers: { relevant: { type: "noul", noul: 0.8 } },
      usage: { input_tokens: 1_024, output_tokens: 0, truncated: true },
    }),
  );
  await expect(
    runtime.ai.decide(input, scope, { provider: "typesafe" }),
  ).rejects.toMatchObject({
    code: "DECISION_INPUT_TRUNCATED",
  });
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
});

it.each([
  [302, "DECISION_REQUEST_FAILED"],
  [401, "DECISION_AUTH_FAILED"],
  [429, "RATE_LIMITED"],
  [422, "DECISION_REQUEST_FAILED"],
  [503, "DECISION_REQUEST_FAILED"],
])(
  "reports HTTP %s without echoing the body or retrying",
  async (status, code) => {
    await runtime.ai.configuration.saveConfig(config(), scope);
    mocks.fetch.mockResolvedValue(
      new Response("private provider body", { status: Number(status) }),
    );
    await expect(
      runtime.ai.decide(input, scope, { provider: "typesafe" }),
    ).rejects.toMatchObject({
      code,
      message: code,
    });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  },
);

it("aborts a stalled inference at the configured deadline without retrying", async () => {
  await runtime.ai.configuration.saveConfig(
    config({ timeoutMs: 1_000 }),
    scope,
  );
  mocks.fetch.mockImplementation(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new Error("aborted")),
        );
      }),
  );
  await expect(
    runtime.ai.decide(input, scope, { provider: "typesafe" }),
  ).rejects.toMatchObject({
    code: "DECISION_TIMEOUT",
  });
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
});
