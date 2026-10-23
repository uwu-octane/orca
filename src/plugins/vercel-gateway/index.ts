import type { Context } from "cordis";

export const name = "vercel-gateway";
export const inject = ["ai"];

export function apply(ctx: Context) {
  ctx.ai.register({
    id: "vercel_gateway",
    languageModel: async (execution, modelId) =>
      (await import("./model")).createGatewayModel(execution, modelId),
    listModels: async (signal) =>
      (await import("./catalog")).listGatewayModels(signal),
    decide: async (input, execution, model) =>
      (await import("@/plugins/shared/systemone")).executeSystemOneDecision(
        input,
        execution,
        model,
        new URL("/typesafe/v1/systemone", execution.connection.endpoint).href,
      ),
  });
}
