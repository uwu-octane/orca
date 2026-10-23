import { AppError } from "@/server/lib/errors";
import type { AiExecution } from "@/plugins/ai/contracts";
import {
  decisionResponseSchema,
  type DecisionInput,
} from "@/types/schemas/decision";

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

/** Shared SystemOne wire protocol; provider plugins select their own endpoint. */
export async function executeSystemOneDecision(
  input: DecisionInput,
  execution: AiExecution,
  model: string,
  endpoint: string,
) {
  const config = execution.connection;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
  await execution.beforeRequest();
  const started = performance.now();
  const timeout = AbortSignal.timeout(config.timeoutMs);
  const signal = AbortSignal.any([timeout, execution.signal]);
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
    return {
      ...result,
      durationMs: Math.round(performance.now() - started),
    };
  } catch (error) {
    if (execution.signal.aborted)
      throw new AppError("AI_PROVIDER_NOT_CONFIGURED");
    if (timeout.aborted) throw new AppError("DECISION_TIMEOUT");
    if (error instanceof AppError) throw error;
    throw new AppError("DECISION_REQUEST_FAILED");
  }
}
