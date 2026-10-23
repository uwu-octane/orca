import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { AiProviderConfigService } from "./AiProviderConfigService";
import { DecisionService } from "@/server/features/decision/DecisionService";
import { KeywordDimensionService } from "@/server/features/keywords/services/KeywordDimensionService";
import { AI_PROVIDERS, DEFAULT_LLM_MODEL } from "@/types/schemas/ai-provider";

const database = await vi.hoisted(async () => {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const client = createClient({ url: "file::memory:" });
  return { client, db: drizzle(client) };
});
vi.mock("@/db", () => ({
  db: database.db,
  withPgClient: (fn: () => unknown) => fn(),
}));
vi.mock("cloudflare:workers", () => ({ env: { DATABASE_PROVIDER: "d1" } }));
vi.mock("@/server/lib/runtime-env", () => ({
  getOptionalEnvValue: async (name: string) =>
    name === "BETTER_AUTH_SECRET"
      ? "test-provider-secret-at-least-32-characters"
      : undefined,
  isHostedServerAuthMode: async () => false,
}));
vi.mock("@/server/features/projects/repositories/ProjectRepository", () => ({
  ProjectRepository: {
    getProjectForOrganization: async () => ({ id: "project-1" }),
  },
}));
beforeAll(async () => {
  await database.client.executeMultiple(
    "CREATE TABLE projects (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, archived_at TEXT); INSERT INTO projects VALUES ('project-1','org-1',NULL);",
  );
  await database.client.executeMultiple(
    readFileSync("drizzle/sqlite/0060_greedy_wiccan.sql", "utf8") +
      ";" +
      readFileSync("drizzle/sqlite/0061_ancient_nuke.sql", "utf8"),
  );
});
afterAll(() => database.client.close());
const scope = { organizationId: "org-1", projectId: "project-1" };
it("shares one Gateway connection across LLM and decision calls with caller-selected models", async () => {
  await AiProviderConfigService.saveConfig(
    {
      projectId: scope.projectId,
      provider: "vercel_gateway",
      endpoint: AI_PROVIDERS.vercel_gateway.endpoint,
      timeoutMs: 60000,
      revision: null,
      credential: {
        action: "replace",
        name: "Research",
        value: "test-secret-key",
      },
    },
    scope,
  );
  const input = {
    state: "coffee beans",
    questions: {
      relevant: {
        type: "noul" as const,
        instructions: "Is this about coffee?",
      },
    },
  };
  const fetchMock = vi.spyOn(globalThis, "fetch");
  const requestBody = (index: number) => {
    const body = fetchMock.mock.calls[index][1]?.body;
    if (typeof body !== "string") throw new Error("Expected JSON body");
    return body;
  };
  const fields = { dimensions: [{ name: "Products", children: ["Coffee"] }] };
  fetchMock.mockImplementation(async (url) =>
    typeof url === "string" && url.endsWith("/language-model")
      ? Response.json({
          content: [
            {
              type: "tool-call",
              toolCallId: "submit-1",
              toolName: "submit_keyword_dimensions",
              input: JSON.stringify(fields),
            },
          ],
          finishReason: { unified: "tool-calls", raw: "tool_calls" },
          usage: {
            inputTokens: {
              total: 20,
              noCache: 20,
              cacheRead: 0,
              cacheWrite: 0,
            },
            outputTokens: { total: 10, text: 10, reasoning: 0 },
          },
        })
      : Response.json({
          model: "jev-release",
          answers: { relevant: { type: "noul", noul: 0.8 } },
        }),
  );
  const generationInput = {
    projectId: scope.projectId,
    keywords: ["coffee beans"],
    language: "en" as const,
  };
  expect(
    await KeywordDimensionService.generate(generationInput, scope),
  ).toEqual(fields);
  await DecisionService.decide(input, scope);
  await KeywordDimensionService.generate(
    { ...generationInput, model: "deepseek/deepseek-v4-flash" },
    scope,
  );
  await DecisionService.decide(input, scope, {
    model: "typesafe-ai/jev-preview",
  });
  expect(fetchMock).toHaveBeenCalledTimes(4);
  for (const [, init] of fetchMock.mock.calls) {
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer test-secret-key",
    );
    expect(init?.redirect).toBe("manual");
  }
  expect(
    new Headers(fetchMock.mock.calls[0][1]?.headers).get(
      "ai-language-model-id",
    ),
  ).toBe(DEFAULT_LLM_MODEL);
  expect(JSON.parse(requestBody(1))).toMatchObject({
    model: "typesafe-ai/jev",
  });
  expect(
    new Headers(fetchMock.mock.calls[2][1]?.headers).get(
      "ai-language-model-id",
    ),
  ).toBe("deepseek/deepseek-v4-flash");
  expect(JSON.parse(requestBody(3))).toMatchObject({
    model: "typesafe-ai/jev-preview",
  });
});
