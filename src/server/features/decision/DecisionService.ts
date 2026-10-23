import { getAiModels } from "@/plugins/server/context";
import type { AiProviderScope } from "@/server/features/ai/AiProviderConfigRepository";
import {
  decisionInputSchema,
  decisionSelectionSchema,
  type DecisionInput,
  type DecisionSelection,
} from "@/types/schemas/decision";

export const DecisionService = {
  async decide(
    input: DecisionInput,
    scope: AiProviderScope,
    selection: DecisionSelection = {},
  ) {
    return (await getAiModels()).decide(
      decisionInputSchema.parse(input),
      scope,
      decisionSelectionSchema.parse(selection),
    );
  },
};
