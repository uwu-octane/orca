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
      "Discover new industry-specific dimensions and subdimensions from keyword search results. For an existing saved taxonomy, use list_keyword_searches and get_keyword_dimensions instead. Pass the actual keywords. Returns English canonical names and Chinese display labels (labelZh). Use name for subsequent decisions, never labelZh. Does not classify individual keywords or change the page's editable draft or saved data.",
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
