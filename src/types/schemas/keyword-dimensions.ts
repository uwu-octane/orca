import { z } from "zod";
import { llmModelSchema } from "./ai-provider";

export const keywordDimensionInputSchema = z
  .object({
    keywords: z.array(z.string().trim().min(1).max(256)).min(1).max(500),
    language: z.enum(["en", "zh"]),
    model: llmModelSchema.optional(),
  })
  .strict()
  .refine((input) => input.keywords.join("\n").length <= 64_000);

export const generateKeywordDimensionsSchema =
  keywordDimensionInputSchema.safeExtend({
    projectId: z.string().min(1),
  });

// Names only: values, definitions, evidence and keyword assignments are not
// part of field discovery. No taxonomy or target field count is prescribed.
export const keywordDimensionsSchema = z
  .object({
    dimensions: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(80),
            children: z.array(z.string().trim().min(1).max(80)).min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export type GenerateKeywordDimensionsInput = z.infer<
  typeof generateKeywordDimensionsSchema
>;
