import type { DecisionInput } from "@/types/schemas/decision";

export function typedDecisionFixture() {
  const request: DecisionInput = {
    state: { keyword: "coffee beans" },
    questions: {
      relevant: { type: "noul", instructions: "Is this about coffee?" },
      intent: {
        type: "choice",
        instructions: "Classify intent",
        criteria: { buy: "Purchase", learn: "Research" },
      },
      urgency: {
        type: "score",
        instructions: "Rate urgency",
        criteria: ["Low", "High"],
      },
    },
  };
  const response = {
    model: "jev-release",
    usage: { input_tokens: 100, output_tokens: 3 },
    answers: {
      relevant: { type: "noul", noul: 0.8 },
      intent: {
        type: "choice",
        choice: "buy",
        confidence: 0.6,
        probabilities: { buy: 0.8, learn: 0.2 },
      },
      urgency: {
        type: "score",
        score: 0.3,
        confidence: 0.4,
        legend: { "0": "Low", "1": "High" },
        probabilities: { "0": 0.7, "1": 0.3 },
      },
    },
  };
  return { request, response };
}
