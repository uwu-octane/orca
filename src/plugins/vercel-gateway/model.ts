import { createGateway, wrapLanguageModel } from "ai";
import { GatewayError } from "@ai-sdk/gateway";
import { AiProviderConfigService } from "@/server/features/ai/AiProviderConfigService";
import type { AiProviderScope } from "@/server/features/ai/AiProviderConfigRepository";
import { llmModelSchema } from "@/types/schemas/ai-provider";
import { AppError } from "@/server/lib/errors";
import { withPgClient } from "@/db";

export async function createProjectGatewayModel(
  scope: AiProviderScope,
  modelId: string,
) {
  const selectedModel = llmModelSchema.parse(modelId);
  const config = await withPgClient(() =>
    AiProviderConfigService.resolve(scope, "vercel_gateway"),
  );
  if (!config.apiKey) throw new AppError("AI_PROVIDER_NOT_CONFIGURED");
  const model = createGateway({
    apiKey: config.apiKey,
    fetch: async (url, init) => {
      await withPgClient(() =>
        AiProviderConfigService.recordUse(
          scope,
          "vercel_gateway",
          config.revision,
        ),
      );
      const signals = [AbortSignal.timeout(config.timeoutMs)];
      if (init?.signal) signals.push(init.signal);
      return fetch(url, {
        ...init,
        redirect: "manual",
        signal: AbortSignal.any(signals),
      });
    },
  })(selectedModel);
  return wrapLanguageModel({
    model,
    middleware: {
      specificationVersion: "v3",
      transformParams: async ({ params }) => ({
        ...params,
        // Apply the user's explicit routing policy at the provider boundary,
        // including SAM's summaries and every tool-loop step.
        providerOptions: {
          ...params.providerOptions,
          gateway: { only: ["deepseek"], models: [] },
        },
      }),
      wrapGenerate: async ({ doGenerate }) => {
        try {
          return await doGenerate();
        } catch (error) {
          throw publicGatewayError(error);
        }
      },
      wrapStream: async ({ doStream }) => {
        try {
          const result = await doStream();
          const reader = result.stream.getReader();
          return {
            ...result,
            stream: new ReadableStream({
              async pull(controller) {
                try {
                  const { done, value: chunk } = await reader.read();
                  if (done) {
                    controller.close();
                    return;
                  }
                  controller.enqueue(
                    chunk.type === "error"
                      ? { ...chunk, error: publicGatewayError(chunk.error) }
                      : chunk,
                  );
                } catch (error) {
                  controller.error(publicGatewayError(error));
                }
              },
              cancel: (reason) => reader.cancel(reason),
            }),
          };
        } catch (error) {
          throw publicGatewayError(error);
        }
      },
    },
  });
}

function publicGatewayError(error: unknown): AppError {
  const status = GatewayError.isInstance(error) ? error.statusCode : undefined;
  let timeout = status === 408 || status === 504;
  // The SDK wraps fetch failures, including our credential-revision guard.
  // Inspect only error types; never expose provider messages or response bodies.
  let cause = error;
  for (let depth = 0; depth < 8 && cause instanceof Error; depth++) {
    if (cause instanceof AppError) return cause;
    timeout ||= ["TimeoutError", "AbortError"].includes(cause.name);
    cause = cause.cause;
  }
  return new AppError(
    timeout
      ? "AI_MODEL_TIMEOUT"
      : status === 402
        ? "KEYWORD_DIMENSIONS_PROVIDER_CREDITS_EXHAUSTED"
        : status === 401 || status === 403
          ? "KEYWORD_DIMENSIONS_ACCESS_FAILED"
          : status === 429
            ? "RATE_LIMITED"
            : "AI_MODEL_REQUEST_FAILED",
    undefined,
    status ? { providerStatus: String(status) } : undefined,
  );
}
