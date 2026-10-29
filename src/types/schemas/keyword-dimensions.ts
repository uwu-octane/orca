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

// Canonical names are English; Chinese labels never identify decision fields.
export const keywordDimensionFieldSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, "Enter a name.")
    .max(80)
    .regex(/^[\u0020-\u007E]+$/, "Use an English name.")
    .describe("Short English canonical name using ASCII characters."),
  labelZh: z
    .string()
    .trim()
    .min(1, "Enter a name.")
    .max(80)
    .describe("Simplified Chinese display translation of name."),
});
export type KeywordDimensionField = z.infer<typeof keywordDimensionFieldSchema>;

// Names only: values, definitions, evidence and keyword assignments are not
// part of field discovery. No taxonomy or target field count is prescribed.
export const keywordDimensionsSchema = z
  .object({
    dimensions: z
      .array(
        keywordDimensionFieldSchema.extend({
          children: z.array(keywordDimensionFieldSchema).min(1),
        }),
      )
      .min(1),
  })
  .strict();

export type GenerateKeywordDimensionsInput = z.infer<
  typeof generateKeywordDimensionsSchema
>;

// FORK: Durable taxonomy edits share stable IDs across labels and activation.
const subdimensionSchema = keywordDimensionFieldSchema.extend({
  id: z.uuid(),
  active: z.boolean(),
});
export const keywordDimensionDraftSchema = z
  .array(
    keywordDimensionFieldSchema.extend({
      id: z.uuid(),
      children: z.array(subdimensionSchema).max(500),
    }),
  )
  .max(100)
  .superRefine((dimensions, ctx) => {
    const ids = dimensions.flatMap((dimension) => [
      dimension.id,
      ...dimension.children.map((child) => child.id),
    ]);
    if (ids.length > 500 || new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: "custom",
        message: "Invalid dimension IDs or field count.",
      });
    for (const siblings of [
      dimensions,
      ...dimensions.map((dimension) => dimension.children),
    ]) {
      for (const key of ["name", "labelZh"] as const) {
        const names = siblings.map((field) =>
          field[key].normalize("NFKC").toLowerCase(),
        );
        if (new Set(names).size !== names.length)
          ctx.addIssue({
            code: "custom",
            message: "This name already exists.",
          });
      }
    }
  });
export type KeywordDimension = z.infer<
  typeof keywordDimensionDraftSchema
>[number];
export const keywordSearchIdentitySchema = z.strictObject({
  projectId: z.string().min(1),
  searchId: z.string().min(1).max(256),
});
export const saveKeywordDimensionsSchema = keywordSearchIdentitySchema.extend({
  revision: z.uuid().nullable(),
  dimensions: keywordDimensionDraftSchema,
});
export const generateSavedKeywordDimensionsSchema =
  keywordSearchIdentitySchema.extend({
    revision: z.uuid().nullable(),
    language: z.enum(["en", "zh"]),
    model: llmModelSchema.optional(),
  });
