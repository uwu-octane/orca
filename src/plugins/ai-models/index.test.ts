import { afterEach, expect, it, vi } from "vitest";
import { Context } from "cordis";
import { MockLanguageModelV3 } from "ai/test";
import AiModelsService from ".";
import AiAgentsService from "@/plugins/ai-agents";
import { bootPlugins } from "@/plugins/shared/plugin";

const roots: Context[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((ctx) => ctx.fiber.dispose()));
});
const scope = { projectId: "project-1", organizationId: "org-1" };

async function setup() {
  const ctx = new Context();
  roots.push(ctx);
  const languageModel = vi.fn(async () => new MockLanguageModelV3());
  const unavailable = vi.fn(async (): Promise<never> => {
    throw new Error("Unavailable");
  });
  await bootPlugins(
    ctx,
    [
      {
        id: "models",
        name: "models",
        config: { textProvider: "vercel_gateway" },
      },
      {
        id: "agents",
        name: "agents",
        config: { keywordDimensions: "alternative-runtime" },
      },
      { id: "provider", name: "provider" },
    ],
    {
      models: async () => ({ default: AiModelsService }),
      agents: async () => ({ default: AiAgentsService }),
      provider: async () => ({
        inject: ["aiModels", "aiAgents"],
        apply(plugin: Context) {
          plugin.aiModels.register({
            id: "vercel_gateway",
            languageModel,
            decide: unavailable,
          });
          plugin.aiModels.register({ id: "typesafe", decide: unavailable });
          plugin.aiAgents.register({
            id: "alternative-runtime",
            generate: async () => ({
              dimensions: [{ name: "Product", children: ["Category"] }],
            }),
          });
        },
      }),
    },
  );
  return { ctx, languageModel, unavailable };
}

it("keeps project credentials out of the registry and passes the scope on every model request", async () => {
  const { ctx, languageModel } = await setup();
  ctx.aiModels.validateRoutes();
  await ctx.aiModels.languageModel(scope, "model-a");
  const other = { projectId: "project-2", organizationId: "org-2" };
  await ctx.aiModels.languageModel(other, "model-b");
  expect(languageModel.mock.calls).toEqual([
    [scope, "model-a"],
    [other, "model-b"],
  ]);
});

it("removes provider registrations on unload instead of substituting another provider", async () => {
  const { ctx, unavailable } = await setup();
  await ctx.loader.remove("provider");
  expect(() => ctx.aiModels.languageModel(scope, "model-a")).toThrow(
    /not registered/,
  );
  expect(unavailable).not.toHaveBeenCalled();
});

it("resolves a different agent implementation through the same business contract", async () => {
  const { ctx, languageModel } = await setup();
  ctx.aiAgents.validateRoutes();
  expect(
    await ctx.aiAgents.generateKeywordDimensions(
      { projectId: scope.projectId, language: "en", keywords: ["coffee"] },
      scope,
    ),
  ).toEqual({ dimensions: [{ name: "Product", children: ["Category"] }] });
  expect(languageModel).not.toHaveBeenCalled();
});
