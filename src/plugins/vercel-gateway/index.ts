import type { Context } from "cordis";

export const name = "vercel-gateway";
export const inject = ["aiModels"];

export function apply(ctx: Context) {
  ctx.aiModels.register({
    id: "vercel_gateway",
    languageModel: async (scope, modelId) =>
      (await import("./model")).createProjectGatewayModel(scope, modelId),
    decide: async (input, scope, selection) =>
      (
        await import("@/server/features/decision/systemOneRequest")
      ).executeSystemOneDecision(input, scope, selection),
  });
}
