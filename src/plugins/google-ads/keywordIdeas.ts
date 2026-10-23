import { z } from "zod";
import { AppError } from "@/server/lib/errors";
import { googleAdsRequest as request } from "@/plugins/google-ads/client";
import type {
  GoogleKeywordIdeasInput,
  GoogleKeywordResult,
} from "@/types/schemas/google-keywords";
import type { KeywordResearchRow } from "@/types/keywords";

const API = "https://googleads.googleapis.com/v25";
const integerSchema = z
  .union([z.string().regex(/^\d+$/), z.number().int().nonnegative()])
  .transform(Number)
  .pipe(z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER));
const months = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
] as const;
const ideaPageSchema = z.object({
  results: z
    .array(
      z.object({
        text: z.string().min(1),
        closeVariants: z.array(z.string()).optional(),
        keywordIdeaMetrics: z
          .object({
            avgMonthlySearches: integerSchema.optional(),
            averageCpcMicros: integerSchema.optional(),
            competitionIndex: integerSchema
              .pipe(z.number().max(100))
              .optional(),
            monthlySearchVolumes: z
              .array(
                z.object({
                  year: integerSchema,
                  month: z.enum(months),
                  monthlySearches: integerSchema.optional(),
                }),
              )
              .optional(),
          })
          .optional(),
      }),
    )
    .optional(),
  nextPageToken: z.string().min(1).optional(),
});

import type { GoogleAdsCredentials } from "@/plugins/google-oauth/contracts";

export async function fetchGoogleKeywordIdeas(
  input: GoogleKeywordIdeasInput,
  config: GoogleAdsCredentials,
): Promise<GoogleKeywordResult> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.accessToken}`,
    "Content-Type": "application/json",
  };
  if (config.loginCustomerId)
    headers["login-customer-id"] = config.loginCustomerId;
  const customerUrl = `${API}/customers/${config.customerId}`;
  const account = z
    .object({
      results: z
        .array(
          z.object({
            customer: z.object({
              currencyCode: z.string().regex(/^[A-Z]{3}$/),
            }),
          }),
        )
        .length(1),
    })
    .safeParse(
      await request(`${customerUrl}/googleAds:search`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: "SELECT customer.currency_code FROM customer LIMIT 1",
        }),
      }),
    );
  if (!account.success) throw new AppError("GOOGLE_ADS_REQUEST_FAILED");

  const parsed = ideaPageSchema.safeParse(
    await request(`${customerUrl}:generateKeywordIdeas`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        keywordSeed: { keywords: input.keywords },
        language: `languageConstants/${input.languageId}`,
        geoTargetConstants: input.geoTargetIds.map(
          (id) => `geoTargetConstants/${id}`,
        ),
        keywordPlanNetwork: input.network,
        includeAdultKeywords: input.includeAdultKeywords,
        historicalMetricsOptions: { includeAverageCpc: true },
        pageSize: input.pageSize,
        pageToken: input.pageToken,
      }),
    }),
  );
  if (!parsed.success) throw new AppError("GOOGLE_ADS_REQUEST_FAILED");

  return {
    provider: "google_ads",
    fetchedAt: new Date().toISOString(),
    currencyCode: account.data.results[0].customer.currencyCode,
    nextPageToken: parsed.data.nextPageToken ?? null,
    rows: (parsed.data.results ?? []).map((idea) => {
      const metrics = idea.keywordIdeaMetrics;
      const row: KeywordResearchRow = {
        keyword: idea.text,
        searchVolume: metrics?.avgMonthlySearches ?? null,
        // Missing months stay missing, never become artificial zero traffic.
        trend: (metrics?.monthlySearchVolumes ?? []).flatMap((month) =>
          month.monthlySearches === undefined
            ? []
            : [
                {
                  year: month.year,
                  month: months.indexOf(month.month) + 1,
                  searchVolume: month.monthlySearches,
                },
              ],
        ),
        cpc:
          metrics?.averageCpcMicros == null
            ? null
            : metrics.averageCpcMicros / 1_000_000,
        competition:
          metrics?.competitionIndex == null
            ? null
            : metrics.competitionIndex / 100,
        keywordDifficulty: null,
        intent: "unknown",
      };
      return {
        ...row,
        keywordDifficulty: null,
        intent: "unknown",
        closeVariants: idea.closeVariants ?? [],
        classification: { status: "not_requested" },
      };
    }),
  };
}
