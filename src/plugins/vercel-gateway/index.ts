import type { Context } from "cordis";
import { gatewayDecisionModelSchema } from "@/types/schemas/ai-provider";
import { AppError } from "@/server/lib/errors";

export const name = "vercel-gateway";
export const inject = ["ai"];

export function apply(ctx: Context) {
  ctx.ai.register({
    id: "vercel_gateway",
    languageModel: async (execution, modelId) =>
      (await import("./model")).createGatewayModel(execution, modelId),
    listModels: async (signal) =>
      (await import("./catalog")).listGatewayModels(signal),
    decide: async (input, execution, model) => {
      const selected = gatewayDecisionModelSchema.safeParse(model);
      if (!selected.success) throw new AppError("DECISION_MODEL_UNSUPPORTED");
      // Gateway translates the native OpenAI Decisions response into SystemOne
      // without asking a language model to invent probabilities or confidence.
      return (
        await import("@/plugins/shared/systemone")
      ).executeSystemOneDecision(
        input,
        execution,
        selected.data,
        new URL("/typesafe/v1/systemone", execution.connection.endpoint).href,
        selected.data.startsWith("openai/")
          ? { only: ["openai"], models: [] }
          : undefined,
      );
    },
  });
}
