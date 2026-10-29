import { z } from "zod";
import {
  keywordIntentSchema,
  savedKeywordIntentSchema,
} from "./keyword-intent";

// Google targeting constants are deliberately separate from DataForSEO's
// location/language identifiers. No implicit market conversion.
export const googleKeywordIdeasSchema = z
  .object({
    projectId: z.string().min(1),
    keywords: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
    geoTargetIds: z.array(z.string().regex(/^\d+$/)).min(1).max(10),
    languageId: z.string().regex(/^\d+$/),
    network: z.enum(["GOOGLE_SEARCH", "GOOGLE_SEARCH_AND_PARTNERS"]),
    includeAdultKeywords: z.boolean(),
    pageSize: z.number().int().min(1).max(500),
    pageToken: z.string().min(1).max(8192).optional(),
  })
  .strict();

// Reserved Jev output boundary. No taxonomy, score threshold, or assignment
// policy is chosen here. Candidate scores are not accepted memberships.
const keywordClassificationSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("not_requested") }),
  z.object({
    status: z.literal("scored"),
    provider: z.literal("typesafe/jev"),
    modelVersion: z.string().min(1),
    taxonomyVersion: z.string().min(1),
    promptVersion: z.string().min(1),
    candidates: z.array(
      z.object({
        groupId: z.string().min(1),
        score: z.number().min(0).max(1),
      }),
    ),
  }),
]);

export const googleKeywordResultSchema = z.object({
  provider: z.literal("google_ads"),
  fetchedAt: z.string(),
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
  rows: z.array(
    z.object({
      keyword: z.string().min(1),
      searchVolume: z.number().nonnegative().nullable(),
      trend: z.array(
        z.object({
          year: z.number().int(),
          month: z.number().int().min(1).max(12),
          searchVolume: z.number().nonnegative(),
        }),
      ),
      cpc: z.number().nonnegative().nullable(),
      competition: z.number().min(0).max(1).nullable(),
      keywordDifficulty: z.null(),
      intent: keywordIntentSchema,
      intentDecision: savedKeywordIntentSchema.optional(),
      closeVariants: z.array(z.string()),
      classification: keywordClassificationSchema,
    }),
  ),
  nextPageToken: z.string().nullable(),
});

export type GoogleKeywordIdeasInput = z.infer<typeof googleKeywordIdeasSchema>;
export type GoogleKeywordResult = z.infer<typeof googleKeywordResultSchema>;
