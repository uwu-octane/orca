import KeywordsService from "@/plugins/keywords/server";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { AI_PROVIDERS, DEFAULT_LLM_MODEL } from "@/types/schemas/ai-provider";

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
vi.mock("@/server/features/projects/repositories/ProjectRepository", () => ({
  ProjectRepository: {
    getProjectForOrganization: async () => ({ id: "project-1" }),
  },
}));
beforeAll(async () => {
  await initializeAiDatabase();
  await resetAiDatabase();
  runtime = await createAiTestRuntime();
  await runtime.plugin(KeywordsService);
});
afterAll(async () => {
  await runtime?.fiber.dispose();
  database.client.close();
});
const scope = { organizationId: "org-1", projectId: "project-1" };
it("shares one Gateway connection across LLM and decision calls with caller-selected models", async () => {
  await runtime.ai.configuration.saveConfig(
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
  const fields = {
    dimensions: [
      {
        name: "Products",
        labelZh: "产品",
        children: [{ name: "Coffee", labelZh: "咖啡" }],
      },
    ],
  };
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
    await runtime.keywords.generateDimensions(generationInput, scope),
  ).toEqual(fields);
  await runtime.ai.decide(input, scope);
  await runtime.keywords.generateDimensions(
    { ...generationInput, model: "deepseek/deepseek-v4-flash" },
    scope,
  );
  await runtime.ai.decide(input, scope, {
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
