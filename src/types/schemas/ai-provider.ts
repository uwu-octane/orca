import { z } from "zod";

export const AI_PROVIDERS = {
  vercel_gateway: {
    label: "Vercel AI Gateway",
    endpoint: "https://ai-gateway.vercel.sh",
    decisionModel: "typesafe-ai/jev",
  },
  typesafe: {
    label: "TypeSafe",
    endpoint: "https://api.typesafe.ai/v1/systemone",
    decisionModel: "jev-latest",
  },
  systemone: {
    label: "Custom service",
    endpoint: "http://127.0.0.1:8765/v1/systemone",
    decisionModel: "english",
  },
} as const;
export const DEFAULT_LLM_MODEL = "deepseek/deepseek-v4.1-flash";
// FORK: OpenAI's native decision model has a different Gateway ID from chat.
export const OPENAI_DECISION_MODEL = "openai/gpt-6-luna-decisions";
export const gatewayDecisionModelSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .refine(
    (model) => !model.startsWith("openai/") || model === OPENAI_DECISION_MODEL,
    "Select a supported decision model.",
  );
export const llmModelSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(
    /^deepseek\/[a-zA-Z0-9][a-zA-Z0-9._:-]*$/,
    "Enter a DeepSeek model ID.",
  );
export const aiProviderSchema = z.enum([
  "vercel_gateway",
  "typesafe",
  "systemone",
]);
export type AiProvider = z.infer<typeof aiProviderSchema>;
export const aiProviderConfigSchema = z.strictObject({
  provider: aiProviderSchema,
  endpoint: z.url().max(2048),
  timeoutMs: z.number().int().min(1000).max(120000),
});
export const saveAiProviderConfigSchema = aiProviderConfigSchema.extend({
  projectId: z.string().min(1),
  revision: z.string().nullable(),
  credential: z.discriminatedUnion("action", [
    z.strictObject({
      action: z.literal("keep"),
      name: z.string().trim().min(1).max(64).optional(),
    }),
    z.strictObject({ action: z.literal("clear") }),
    z.strictObject({
      action: z.literal("replace"),
      name: z.string().trim().min(1).max(64),
      value: z.string().trim().min(1).max(4096),
    }),
  ]),
});
export type AiProviderConfig = z.infer<typeof aiProviderConfigSchema>;
export type SaveAiProviderConfig = z.infer<typeof saveAiProviderConfigSchema>;
export type AiProviderConfigSummary = AiProviderConfig & {
  hasApiKey: boolean;
  keyName: string | null;
  keyLastFour: string | null;
  keyAddedAt: string | null;
  lastUsedAt: string | null;
  revision: string;
};
