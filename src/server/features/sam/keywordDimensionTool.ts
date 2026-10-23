import { tool } from "ai";
import { withPgClient } from "@/db";
import { KeywordDimensionService } from "@/server/features/keywords/services/KeywordDimensionService";
import { keywordDimensionInputSchema } from "@/types/schemas/keyword-dimensions";
import type { AiProviderScope } from "@/server/features/ai/AiProviderConfigRepository";
import { asAppError } from "@/server/lib/errors";

/** Internal SAM tool; the model cannot supply or switch its project/org. */
export function keywordDimensionTool(scope: AiProviderScope) {
  return tool({
    description:
      "Generate industry-specific dimensions and subdimension names from keyword search results. Pass the actual keywords. Returns field names only, without classifying individual keywords or changing saved data.",
    inputSchema: keywordDimensionInputSchema,
    execute: async (input) => {
      try {
        return await withPgClient(() =>
          KeywordDimensionService.generate(
            { ...input, projectId: scope.projectId },
            scope,
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
