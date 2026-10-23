import type { Context } from "cordis";
import { DEFAULT_LLM_MODEL } from "@/types/schemas/ai-provider";

export const name = "keyword-dimension-agent";
export const inject = ["ai", "aiAgents"];
export function apply(ctx: Context) {
  ctx.inject(["sam"], (scope) => {
    scope.sam.registerTool(
      "generate_keyword_dimensions",
      async ({ auth, project }) =>
        (await import("./sam-tool")).keywordDimensionTool({
          projectId: project.id,
          organizationId: auth.organizationId,
        }),
    );
  });
  ctx.aiAgents.register({
    id: "ai-sdk",
    generate: async (input, scope) => {
      const model = await ctx.ai.languageModel(
        scope,
        input.model ?? DEFAULT_LLM_MODEL,
      );
      return (await import("./agent")).generateDimensions(model, input);
    },
  });
}
