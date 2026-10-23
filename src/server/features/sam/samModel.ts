// FORK: resolve every inference through the installed Cordis model provider.
import { getAi } from "@/plugins/server/context";
import type { TextModel } from "@/plugins/ai/contracts";
import type { AiProviderScope } from "@/plugins/ai/contracts";
import { DEFAULT_LLM_MODEL } from "@/types/schemas/ai-provider";
import { z } from "zod";

/** Think requires a synchronous model hook. Credentials resolve only when a
 * real inference runs, after beforeTurn has enforced access and tool credits. */
export function createSamModel(
  scope: () => Promise<AiProviderScope>,
  modelId = DEFAULT_LLM_MODEL,
): TextModel {
  const resolve = async () =>
    (await getAi()).languageModel(await scope(), modelId);
  return {
    specificationVersion: "v3",
    provider: "orca.cordis",
    modelId,
    supportedUrls: {},
    doGenerate: async (params) => (await resolve()).doGenerate(params),
    doStream: async (params) => (await resolve()).doStream(params),
  };
}

const usageSchema = z.object({
  gateway: z.object({
    cost: z
      .union([
        z.number(),
        z
          .string()
          .regex(/^\d+(?:\.\d+)?$/)
          .transform(Number),
      ])
      .pipe(z.number().finite().nonnegative()),
  }),
});
export function gatewayCostUsd(metadata: unknown): number | null {
  const parsed = usageSchema.safeParse(metadata);
  return parsed.success ? parsed.data.gateway.cost : null;
}
