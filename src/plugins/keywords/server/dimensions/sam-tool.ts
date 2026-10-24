import { tool } from "ai";
import { withPgClient } from "@/db";
import type { DimensionGenerator, KeywordScope } from "../../contracts";
import { keywordDimensionInputSchema } from "@/types/schemas/keyword-dimensions";
import { asAppError } from "@/server/lib/errors";

/** Internal SAM tool; the model cannot supply or switch its project/org. */
export function keywordDimensionTool(
  scope: KeywordScope,
  generate: DimensionGenerator,
) {
  return tool({
    description:
      "Generate industry-specific dimensions and subdimension names from keyword search results. Pass the actual keywords. Returns field names only, without classifying individual keywords or changing saved data.",
    inputSchema: keywordDimensionInputSchema,
    execute: async (input, options) => {
      try {
        return await withPgClient(() =>
          generate(
            { ...input, projectId: scope.projectId },
            scope,
            options.abortSignal,
          ),
        );
      } catch (error) {
        return {
          error:
            asAppError(error)?.code ?? "KEYWORD_DIMENSIONS_GENERATION_FAILED",
        };
      }
    },
  });
}
