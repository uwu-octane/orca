import type { KeywordDimension } from "@/types/schemas/keyword-dimensions";
import {
  decisionInputSchema,
  type DecisionInput,
} from "@/types/schemas/decision";

// Build reviewable SystemOne inputs from the same saved fields used by the UI.
// Each keyword/subdimension pair is independent; other keywords and metrics
// never enter its evidence. Labels are presentation, stable child IDs name answers.
export function buildKeywordMembershipInputs(
  dimensions: KeywordDimension[],
  keyword: string,
): DecisionInput[] {
  const inputs: DecisionInput[] = [];
  let input: DecisionInput = { state: { keyword }, questions: {} };
  for (const dimension of dimensions) {
    for (const child of dimension.children) {
      if (!child.active || !child.decision) continue;
      const name = `d_${child.id}`;
      const question = { type: "noul" as const, ...child.decision };
      const next = {
        ...input,
        questions: { ...input.questions, [name]: question },
      };
      if (decisionInputSchema.safeParse(next).success) input = next;
      else {
        if (Object.keys(input.questions).length) inputs.push(input);
        input = decisionInputSchema.parse({
          state: { keyword },
          questions: { [name]: question },
        });
      }
    }
  }
  if (Object.keys(input.questions).length) inputs.push(input);
  return inputs;
}
