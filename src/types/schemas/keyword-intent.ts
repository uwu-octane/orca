import { z } from "zod";
import { aiProviderSchema } from "./ai-provider";
import { decisionSelectionSchema } from "./decision";

export const keywordIntentSchema = z.enum([
  "informational",
  "commercial",
  "transactional",
  "navigational",
  "unknown",
]);
export const savedKeywordIntentSchema = z.object({
  intent: keywordIntentSchema,
  provider: aiProviderSchema,
  model: z.string().min(1),
  promptVersion: z.string().min(1),
  decidedAt: z.string().min(1),
});
export const classifyKeywordIntentSchema = z.object({
  projectId: z.string().min(1),
  searchId: z.string().min(1),
  keyword: z.string().min(1),
  selection: decisionSelectionSchema.optional(),
});
