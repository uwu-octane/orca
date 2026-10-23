import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from "vitest";
import type { Context } from "cordis";
import {
  database,
  initializeAiDatabase,
  resetAiDatabase,
} from "./testDatabase";
import { createAiTestRuntime } from "./testRuntime";
import { AI_PROVIDERS, DEFAULT_LLM_MODEL } from "@/types/schemas/ai-provider";

vi.mock("@/db", async () => {
  const { database: fixture } = await import("./testDatabase");
  return { db: fixture.db, withPgClient: (fn: () => unknown) => fn() };
});
vi.mock("cloudflare:workers", () => ({ env: { DATABASE_PROVIDER: "d1" } }));
vi.mock("@/server/lib/runtime-env", () => ({
  getOptionalEnvValue: async (name: string) =>
    name === "BETTER_AUTH_SECRET"
      ? "test-provider-secret-at-least-32-characters"
      : undefined,
  isHostedServerAuthMode: async () => false,
}));
let runtime: Context;
const scope = { projectId: "project-1", organizationId: "org-1" };
const request = {
  state: "coffee",
  questions: {
    relevant: { type: "noul" as const, instructions: "Is this about coffee?" },
  },
};
const prompt = [
  {
    role: "user" as const,
    content: [{ type: "text" as const, text: "Hello" }],
  },
];
const connection = (projectId = scope.projectId, key = "gateway-key") => ({
  projectId,
  provider: "vercel_gateway" as const,
  endpoint: AI_PROVIDERS.vercel_gateway.endpoint,
  timeoutMs: 60000,
  revision: null,
  credential: { action: "replace" as const, name: "Research", value: key },
});
beforeAll(initializeAiDatabase);
afterAll(() => database.client.close());
beforeEach(async () => {
  await resetAiDatabase();
  vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
    Response.json({
      model: "jev",
      answers: { relevant: { type: "noul", noul: 0.8 } },
    }),
  );
  runtime = await createAiTestRuntime();
});
afterEach(async () => {
  await runtime?.fiber.dispose();
});

it("isolates credentials across two projects using the same root service", async () => {
  const other = { projectId: "project-2", organizationId: "org-2" };
  await runtime.ai.configuration.saveConfig(connection(), scope);
  await runtime.ai.configuration.saveConfig(
    connection(other.projectId, "other-project-key"),
    other,
  );
  await runtime.ai.decide(request, scope);
  await runtime.ai.decide(request, other);
  expect(
    vi
      .mocked(fetch)
      .mock.calls.map(([, init]) =>
        new Headers(init?.headers).get("authorization"),
      ),
  ).toEqual(["Bearer gateway-key", "Bearer other-project-key"]);
});

it("aborts an in-flight decision and removes its provider when the plugin unloads", async () => {
  await runtime.ai.configuration.saveConfig(connection(), scope);
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  vi.mocked(fetch).mockImplementation(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(init.signal?.reason),
          { once: true },
        );
        markStarted();
      }),
  );
  const pending = expect(
    runtime.ai.decide(request, scope),
  ).rejects.toMatchObject({ code: "AI_PROVIDER_NOT_CONFIGURED" });
  await started;
  await runtime.loader.remove("vercel-gateway");
  await pending;
  await expect(runtime.ai.decide(request, scope)).rejects.toThrow(
    /not registered/,
  );
  expect(fetch).toHaveBeenCalledTimes(1);
});

it.each(["rotate", "remove"] as const)(
  "rejects an already resolved model after credentials %s, before sending another request",
  async (action) => {
    const saved = await runtime.ai.configuration.saveConfig(
      connection(),
      scope,
    );
    const model = await runtime.ai.languageModel(scope, DEFAULT_LLM_MODEL);
    if (action === "remove")
      await runtime.ai.configuration.removeConfig(
        scope,
        "vercel_gateway",
        saved!.revision,
      );
    else
      await runtime.ai.configuration.saveConfig(
        {
          ...connection(scope.projectId, "new-key"),
          revision: saved!.revision,
        },
        scope,
      );
    await expect(model.doGenerate({ prompt })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(fetch).not.toHaveBeenCalled();
  },
);

it("prevents a retained language model from using credentials after its provider unloads", async () => {
  await runtime.ai.configuration.saveConfig(connection(), scope);
  const model = await runtime.ai.languageModel(scope, DEFAULT_LLM_MODEL);
  await runtime.loader.remove("vercel-gateway");
  await expect(model.doGenerate({ prompt })).rejects.toMatchObject({
    code: "AI_PROVIDER_NOT_CONFIGURED",
  });
  expect(fetch).not.toHaveBeenCalled();
});
