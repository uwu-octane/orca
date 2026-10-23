import { AppError } from "@/server/lib/errors";
import { AiProviderConfigService } from "@/server/features/ai/AiProviderConfigService";
import type { AiProviderScope } from "@/server/features/ai/AiProviderConfigRepository";
import { AI_PROVIDERS } from "@/types/schemas/ai-provider";
import {
  decisionInputSchema,
  decisionResponseSchema,
  decisionSelectionSchema,
  type DecisionSelection,
  type DecisionInput,
  type DecisionResponse,
} from "@/types/schemas/decision";

function sameKeys(actual: string[], expected: string[]) {
  return (
    actual.length === expected.length &&
    expected.every((key) => actual.includes(key))
  );
}

function validateAnswers(input: DecisionInput, result: DecisionResponse) {
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

async function readResult(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) throw new AppError("DECISION_INVALID_RESPONSE");
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 1_000_000) throw new AppError("DECISION_INVALID_RESPONSE");
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    const result = decisionResponseSchema.safeParse(JSON.parse(text));
    if (!result.success) throw new AppError("DECISION_INVALID_RESPONSE");
    return result.data;
  } catch {
    // Provider bodies may echo user content or credentials. Do not log them.
    throw new AppError("DECISION_INVALID_RESPONSE");
  } finally {
    await reader.cancel();
  }
}

export async function executeSystemOneDecision(
  raw: DecisionInput,
  scope: AiProviderScope,
  selection: DecisionSelection = {},
) {
  const input = decisionInputSchema.parse(raw);
  const { provider, model: selectedModel } =
    decisionSelectionSchema.parse(selection);
  const config = await AiProviderConfigService.resolve(scope, provider);
  const model = selectedModel ?? AI_PROVIDERS[provider].decisionModel;
  const endpoint =
    provider === "vercel_gateway"
      ? new URL("/typesafe/v1/systemone", config.endpoint).href
      : config.endpoint;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
  await AiProviderConfigService.recordUse(scope, provider, config.revision);
  const started = performance.now();
  const signal = AbortSignal.timeout(config.timeoutMs);
  // Exactly one inference call. No retries, provider switches or generated
  // substitute answers; callers own their decision policy.
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...input, model }),
      // Workerd supports manual/follow, not error. Non-2xx below rejects redirects.
      redirect: "manual",
      signal,
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 401 || response.status === 403)
        throw new AppError("DECISION_AUTH_FAILED");
      if (response.status === 429) throw new AppError("RATE_LIMITED");
      throw new AppError("DECISION_REQUEST_FAILED");
    }
    const result = await readResult(response);
    validateAnswers(input, result);
    return {
      ...result,
      provider: config.provider,
      requestedModel: model,
      configRevision: config.revision,
      durationMs: Math.round(performance.now() - started),
    };
  } catch (error) {
    if (signal.aborted) throw new AppError("DECISION_TIMEOUT");
    if (error instanceof AppError) throw error;
    throw new AppError("DECISION_REQUEST_FAILED");
  }
}
