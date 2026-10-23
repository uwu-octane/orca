import { z } from "zod";
import { AppError } from "@/server/lib/errors";
import {
  gatewayModelKindSchema,
  type GatewayModel,
} from "@/types/schemas/gateway-model";

const price = z
  .string()
  .max(32)
  .regex(/^\d+(?:\.\d+)?$/)
  .transform(Number)
  .pipe(z.number().nonnegative().finite());
const policy = z.enum(["all", "some", "none"]).nullish();
const modelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: gatewayModelKindSchema,
  owned_by: z.string().min(1),
  pricing: z
    .object({ input: price.nullish(), output: price.nullish() })
    .nullish(),
  context_window: z.number().int().nonnegative().nullish(),
  released: z.number().int().nonnegative().nullish(),
  tags: z.array(z.string()).optional(),
  zdr: policy,
  no_training: policy,
});
const catalogSchema = z.object({
  data: z.array(z.object({ type: z.string() }).loose()),
});

export async function listGatewayModels(
  signal: AbortSignal,
): Promise<GatewayModel[]> {
  try {
    // This public catalog needs no project key. Never send saved credentials or
    // let callers supply an endpoint; model discovery does not run inference.
    const response = await fetch("https://ai-gateway.vercel.sh/v1/models", {
      headers: { Accept: "application/json" },
      redirect: "manual",
      signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new AppError("AI_MODEL_CATALOG_UNAVAILABLE");
    }
    const catalog = catalogSchema.parse(await response.json());
    return catalog.data
      .filter(
        (model) => model.type === "language" || model.type === "evaluation",
      )
      .map((value) => {
        const model = modelSchema.parse(value);
        return {
          id: model.id,
          name: model.name,
          kind: model.type,
          creator: model.owned_by,
          // REST prices are USD per token. Preserve missing prices as unknown;
          // zero means free and is different from an absent price.
          inputPrice:
            model.pricing?.input == null
              ? null
              : model.pricing.input * 1_000_000,
          outputPrice:
            model.pricing?.output == null
              ? null
              : model.pricing.output * 1_000_000,
          contextWindow: model.context_window ?? null,
          released: model.released == null ? null : model.released * 1000,
          capabilities: model.tags ?? [],
          zeroDataRetention: model.zdr ?? null,
          noTraining: model.no_training ?? null,
        };
      });
  } catch {
    // Do not return upstream response bodies or substitute a hardcoded catalog.
    throw new AppError("AI_MODEL_CATALOG_UNAVAILABLE");
  }
}
