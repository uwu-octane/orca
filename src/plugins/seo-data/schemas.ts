import { z } from "zod";
import { CREDIT_FEATURES } from "@/shared/billing-credit-features";

export const keywordMetricsInputSchema = z.strictObject({
  keywords: z.array(z.string()),
  locationCode: z.number().int().positive(),
  languageCode: z.string().min(1),
  creditFeature: z.enum(CREDIT_FEATURES),
  includeClickstreamData: z.boolean().optional(),
  locationName: z.string().optional(),
});

/** Metrics retain null for unavailable values; competition is a 0–1 ratio.
 * Monthly values preserve the existing adapter's numeric representation. */
export const keywordMetricSchema = z.strictObject({
  keyword: z.string(),
  searchVolume: z.number().nullable(),
  cpc: z.number().nullable(),
  competition: z.number().min(0).max(1).nullable(),
  competitionLevel: z.string().nullable(),
  keywordDifficulty: z.number().nullable(),
  intent: z.string().nullable(),
  monthlySearches: z.array(
    z.strictObject({
      year: z.number(),
      month: z.number(),
      searchVolume: z.number(),
    }),
  ),
});

export const keywordMetricsResultSchema = z.array(keywordMetricSchema);

export type KeywordMetricsInput = z.infer<typeof keywordMetricsInputSchema>;
export type KeywordMetric = z.infer<typeof keywordMetricSchema>;

/** Existing live query semantics: Google, desktop/Windows; upstream default depth 20. */
export const serpLiveInputSchema = z.strictObject({
  depth: z.number().optional(),
  locationName: z.string().optional(),
  device: z.enum(["desktop", "mobile"]).optional(),
  keyword: z.string(),
  locationCode: z.number().int().positive(),
  languageCode: z.string().min(1),
  creditFeature: z.enum(CREDIT_FEATURES).optional(),
});

/** Application-owned SERP fields. Snake-case names preserve the existing
 * consumer protocol; rank_group and rank_absolute remain distinct. Extra
 * fields are preserved for existing downstream projections. */
export const serpItemSchema = z
  .object({
    type: z.string(),
    rank_group: z.number().nullable().optional(),
    rank_absolute: z.number().nullable().optional(),
    domain: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    breadcrumb: z.string().nullable().optional(),
    etv: z.number().nullable().optional(),
    estimated_paid_traffic_cost: z.number().nullable().optional(),
    backlinks_info: z
      .object({
        referring_domains: z.number().nullable().optional(),
        backlinks: z.number().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    rank_changes: z
      .object({
        previous_rank_absolute: z.number().nullable().optional(),
        is_new: z.boolean().nullable().optional(),
        is_up: z.boolean().nullable().optional(),
        is_down: z.boolean().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

export const serpLiveResultSchema = z.array(serpItemSchema);
export type SerpLiveInput = z.infer<typeof serpLiveInputSchema>;
export type SerpItem = z.infer<typeof serpItemSchema>;
