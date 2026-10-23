import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import type { z } from "zod";
import {
  AI_PROVIDERS,
  type SaveAiProviderConfig,
} from "@/types/schemas/ai-provider";
const TYPESAFE_DECISION_ENDPOINT = AI_PROVIDERS.typesafe.endpoint;
const VERCEL_GATEWAY_ENDPOINT = AI_PROVIDERS.vercel_gateway.endpoint;

import {
  saveAiProviderConfig,
  removeAiProviderConfig,
} from "@/serverFunctions/aiProviders";
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
  getAiAgents: async () => runtime.aiAgents,
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
vi.mock("@/serverFunctions/middleware", () => ({ requireProjectContext: [] }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    middleware: () => ({
      validator: (schema: z.ZodType) => ({
        handler:
          (
            handler: (input: {
              data: unknown;
              context: typeof mocks.context;
            }) => unknown,
          ) =>
          async ({ data }: { data: unknown }) =>
            handler({ data: schema.parse(data), context: mocks.context }),
      }),
    }),
  }),
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

it("encrypts the credential in SQL and never returns it in configuration summaries", async () => {
  const saved = await runtime.ai.configuration.saveConfig(config(), scope);
  const rows = await database.client.execute(
    "SELECT encrypted_api_key FROM ai_provider_configs",
  );
  expect(rows.rows[0].encrypted_api_key).toBeTruthy();
  expect(rows.rows[0].encrypted_api_key).not.toBe("test-secret-key");
  expect(saved).toMatchObject({
    hasApiKey: true,
    keyName: "Research",
    keyLastFour: "-key",
    lastUsedAt: null,
  });
  expect(saved?.keyAddedAt).toEqual(expect.any(String));
  expect(JSON.stringify(saved)).not.toContain("test-secret-key");
  expect(saved).not.toHaveProperty("encryptedApiKey");
  await runtime.ai.decide(input, scope, { provider: "typesafe" });
  expect(mocks.fetch.mock.calls[0][1]?.headers).toMatchObject({
    Authorization: "Bearer test-secret-key",
  });
  expect(
    (await runtime.ai.configuration.getConfig(scope, "typesafe"))?.lastUsedAt,
  ).toEqual(expect.any(String));
});

it("isolates project configurations by organization and deletes them with the project", async () => {
  await runtime.ai.configuration.saveConfig(config(), scope);
  const otherOrg = { ...scope, organizationId: "org-2" };
  expect(
    await runtime.ai.configuration.getConfig(otherOrg, "typesafe"),
  ).toBeNull();
  await expect(
    runtime.ai.configuration.saveConfig(config(), otherOrg),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(
    runtime.ai.decide(input, otherOrg, { provider: "typesafe" }),
  ).rejects.toMatchObject({
    code: "AI_PROVIDER_NOT_CONFIGURED",
  });
  expect(mocks.fetch).not.toHaveBeenCalled();
  await database.client.execute("DELETE FROM projects WHERE id = 'project-1'");
  expect(
    (await database.client.execute("SELECT * FROM ai_provider_configs")).rows,
  ).toHaveLength(0);
});

it("requires integration management permission to change or remove a model", async () => {
  mocks.context.role = "member";
  await expect(saveAiProviderConfig({ data: config() })).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  await expect(
    removeAiProviderConfig({
      data: {
        projectId: scope.projectId,
        provider: "typesafe",
        revision: "existing",
      },
    }),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(
    await runtime.ai.configuration.getConfig(scope, "typesafe"),
  ).toBeNull();
});

it("stores independent provider credentials and rejects stale updates and removals", async () => {
  const original = await runtime.ai.configuration.saveConfig(config(), scope);
  const gateway = await runtime.ai.configuration.saveConfig(
    config({
      provider: "vercel_gateway",
      endpoint: VERCEL_GATEWAY_ENDPOINT,
      credential: { action: "replace", name: "Research", value: "gateway-key" },
    }),
    scope,
  );
  const current = await runtime.ai.configuration.saveConfig(
    config({
      revision: original!.revision,
      timeoutMs: 45000,
      credential: { action: "keep" },
    }),
    scope,
  );
  await expect(
    runtime.ai.configuration.saveConfig(
      config({ revision: original!.revision }),
      scope,
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await expect(
    runtime.ai.configuration.removeConfig(
      scope,
      "typesafe",
      original!.revision,
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await runtime.ai.decide(input, scope, { provider: "typesafe" });
  await runtime.ai.decide(input, scope, { provider: "vercel_gateway" });
  expect(
    mocks.fetch.mock.calls.map(([, init]) =>
      new Headers(init?.headers).get("authorization"),
    ),
  ).toEqual(["Bearer test-secret-key", "Bearer gateway-key"]);
  await runtime.ai.configuration.removeConfig(
    scope,
    "typesafe",
    current!.revision,
  );
  expect(
    await runtime.ai.configuration.getConfig(scope, "vercel_gateway"),
  ).toMatchObject({ revision: gateway!.revision, hasApiKey: true });
  expect(
    await runtime.ai.configuration.getConfig(scope, "typesafe"),
  ).toBeNull();
});

it("requires an explicit new credential when a custom endpoint changes", async () => {
  const original = await runtime.ai.configuration.saveConfig(
    config({
      provider: "systemone",
      endpoint: "http://localhost:8765/v1/systemone",
    }),
    scope,
  );
  await expect(
    runtime.ai.configuration.saveConfig(
      config({
        provider: "systemone",
        endpoint: "http://localhost:8099/v1/systemone",
        revision: original!.revision,
        credential: { action: "keep" },
      }),
      scope,
    ),
  ).rejects.toMatchObject({ code: "AI_PROVIDER_CONFIG_INVALID" });
});

it.each([
  { provider: "typesafe", endpoint: TYPESAFE_DECISION_ENDPOINT },
  { provider: "vercel_gateway", endpoint: VERCEL_GATEWAY_ENDPOINT },
] as const)("$provider requires a key", async (service) => {
  await expect(
    runtime.ai.configuration.saveConfig(
      config({ ...service, credential: { action: "clear" } }),
      scope,
    ),
  ).rejects.toMatchObject({ code: "AI_PROVIDER_CONFIG_INVALID" });
  expect(
    await runtime.ai.configuration.getConfig(scope, "typesafe"),
  ).toBeNull();
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it.each(["typesafe", "vercel_gateway"] as const)(
  "%s rejects replacement endpoints before storing or sending credentials",
  async (provider) => {
    await expect(
      runtime.ai.configuration.saveConfig(
        config({ provider, endpoint: "https://example.com/v1/systemone" }),
        scope,
      ),
    ).rejects.toMatchObject({ code: "AI_PROVIDER_CONFIG_INVALID" });
    expect(
      await runtime.ai.configuration.getConfig(scope, "typesafe"),
    ).toBeNull();
    expect(mocks.fetch).not.toHaveBeenCalled();
  },
);

it.each([
  "http://10.attacker.example/v1/systemone",
  "http://169.254.169.254/v1/systemone",
  "https://metadata.google.internal/v1/systemone",
  "http://100.100.100.200/v1/systemone",
  "file:///v1/systemone",
  "http://localhost:8765/private",
  "http://user:secret@localhost:8765/v1/systemone",
  "http://localhost:8765/v1/systemone?key=secret",
])(
  "rejects unsafe service addresses before sending credentials: %s",
  async (endpoint) => {
    await expect(
      runtime.ai.configuration.saveConfig(
        config({ provider: "systemone", endpoint }),
        scope,
      ),
    ).rejects.toMatchObject({ code: "AI_PROVIDER_CONFIG_INVALID" });
    expect(mocks.fetch).not.toHaveBeenCalled();
  },
);

it("does not permit hosted tenants to target the server's loopback interface", async () => {
  mocks.hosted = true;
  await expect(
    runtime.ai.configuration.saveConfig(
      config({
        provider: "systemone",
        endpoint: "http://127.0.0.1:8765/v1/systemone",
      }),
      scope,
    ),
  ).rejects.toMatchObject({ code: "AI_PROVIDER_CONFIG_INVALID" });
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it("renames without rotating the secret and resets usage metadata on explicit replacement", async () => {
  const first = await runtime.ai.configuration.saveConfig(config(), scope);
  await runtime.ai.decide(input, scope, { provider: "typesafe" });
  const originalCipher = (
    await database.client.execute(
      "SELECT encrypted_api_key FROM ai_provider_configs",
    )
  ).rows[0].encrypted_api_key;
  const renamed = await runtime.ai.configuration.saveConfig(
    config({
      revision: first!.revision,
      credential: { action: "keep", name: "Production" },
    }),
    scope,
  );
  expect(renamed).toMatchObject({
    keyName: "Production",
    keyAddedAt: first!.keyAddedAt,
  });
  expect(
    (
      await database.client.execute(
        "SELECT encrypted_api_key FROM ai_provider_configs",
      )
    ).rows[0].encrypted_api_key,
  ).toBe(originalCipher);
  expect(renamed?.lastUsedAt).toEqual(expect.any(String));
  const replaced = await runtime.ai.configuration.saveConfig(
    config({
      revision: renamed!.revision,
      credential: {
        action: "replace",
        name: "New",
        value: "replacement-secret",
      },
    }),
    scope,
  );

  expect(
    await runtime.ai.configuration.getConfig(scope, "typesafe"),
  ).toMatchObject({
    revision: replaced!.revision,
    keyName: "New",
    keyLastFour: "cret",
    lastUsedAt: null,
  });
});

it("does not reveal a short custom key through its masked suffix", async () => {
  const saved = await runtime.ai.configuration.saveConfig(
    config({
      provider: "systemone",
      endpoint: "http://localhost:8765/v1/systemone",
      credential: { action: "replace", name: "Local", value: "tiny" },
    }),
    scope,
  );
  expect(saved).toMatchObject({ hasApiKey: true, keyLastFour: null });
  expect(JSON.stringify(saved)).not.toContain("tiny");
});
