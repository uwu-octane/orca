import { AppError } from "@/server/lib/errors";
import type { DecisionInput, DecisionResponse } from "@/types/schemas/decision";

function sameKeys(actual: string[], expected: string[]) {
  return (
    actual.length === expected.length &&
    expected.every((key) => actual.includes(key))
  );
}

export function validateAnswers(
  input: DecisionInput,
  result: DecisionResponse,
) {
  if (
    result.usage?.truncated ||
    (result.usage?.state_tokens_dropped ?? 0) > 0 ||
    (result.usage?.truncated_questions?.length ?? 0) > 0
  ) {
    throw new AppError("DECISION_INPUT_TRUNCATED");
  }
  if (!sameKeys(Object.keys(result.answers), Object.keys(input.questions)))
    throw new AppError("DECISION_INVALID_RESPONSE");
  for (const [name, question] of Object.entries(input.questions)) {
    const answer = result.answers[name];
    if (answer.type !== question.type)
      throw new AppError("DECISION_INVALID_RESPONSE");
    if (answer.type === "choice" && question.type === "choice") {
      if (
        !Object.hasOwn(question.criteria, answer.choice) ||
        !sameKeys(
          Object.keys(answer.probabilities),
          Object.keys(question.criteria),
        )
      )
        throw new AppError("DECISION_INVALID_RESPONSE");
    }
    if (answer.type === "score" && question.type === "score") {
      const levels = question.criteria.map((_, index) => String(index));
      if (
        answer.score < 0 ||
        answer.score > question.criteria.length - 1 ||
        !sameKeys(Object.keys(answer.probabilities), levels) ||
        !sameKeys(Object.keys(answer.legend), levels) ||
        question.criteria.some(
          (label, index) => answer.legend[String(index)] !== label,
        )
      )
        throw new AppError("DECISION_INVALID_RESPONSE");
    }
    if (
      answer.type !== "noul" &&
      Math.abs(
        Object.values(answer.probabilities).reduce(
          (sum, value) => sum + value,
          0,
        ) - 1,
      ) > 0.02
    )
      throw new AppError("DECISION_INVALID_RESPONSE");
  }
}
