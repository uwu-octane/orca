import { z } from "zod";

import { aiProviderSchema } from "./ai-provider";

const name = z
  .string()
  .min(1)
  .max(128)
  .refine(
    (value) => !["__proto__", "constructor", "prototype"].includes(value),
  );
const description = z.string().max(8_000);
const probability = z.number().min(0).max(1);
const question = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("noul"),
    instructions: description.min(1),
    criteria: z
      .strictObject({ true: description, false: description })
      .optional(),
  }),
  z.strictObject({
    type: z.literal("choice"),
    instructions: description.min(1),
    criteria: z.record(name, description).refine((value) => {
      const count = Object.keys(value).length;
      return count >= 2 && count <= 255;
    }, "Provide between 2 and 255 choices."),
  }),
  z.strictObject({
    type: z.literal("score"),
    instructions: description.min(1),
    criteria: z.array(description.min(1)).min(2).max(10),
  }),
]);

// A text-only common contract. No prompt rewriting, probability thresholds,
// or provider-specific policy is applied here.
export const decisionInputSchema = z
  .strictObject({
    state: z.union([
      z.string(),
      z.record(z.string(), z.json()),
      z.array(z.json()),
    ]),
    questions: z.record(name, question).refine((value) => {
      const count = Object.keys(value).length;
      return count >= 1 && count <= 32;
    }, "Provide between 1 and 32 questions."),
  })
  .refine(
    (value) => JSON.stringify(value).length <= 64_000,
    "Decision input is too large.",
  );

const probabilities = z.record(name, probability);
export const decisionResponseSchema = z.object({
  model: z.string().min(1),
  answers: z.record(
    name,
    z.discriminatedUnion("type", [
      z.object({ type: z.literal("noul"), noul: probability }),
      z.object({
        type: z.literal("choice"),
        choice: name,
        confidence: probability,
        probabilities,
      }),
      z.object({
        type: z.literal("score"),
        score: z.number(),
        confidence: probability,
        legend: z.record(name, description),
        probabilities,
      }),
    ]),
  ),
  // Local servers may not report token usage; absence is not a zero token bill.
  usage: z
    .object({
      input_tokens: z.number().int().nonnegative(),
      output_tokens: z.number().int().nonnegative(),
      truncated: z.boolean().optional(),
      state_tokens_dropped: z.number().int().nonnegative().optional(),
      truncated_questions: z.array(z.string()).optional(),
    })
    .optional(),
});

export const decisionSelectionSchema = z.object({
  provider: aiProviderSchema.default("vercel_gateway"),
  model: z.string().trim().min(1).max(200).optional(),
});
export type DecisionSelection = z.input<typeof decisionSelectionSchema>;
export const decisionRequestSchema = z.object({
  projectId: z.string().min(1),
  input: decisionInputSchema,
  selection: decisionSelectionSchema.optional(),
});
export type DecisionInput = z.infer<typeof decisionInputSchema>;
export type DecisionResponse = z.infer<typeof decisionResponseSchema>;
