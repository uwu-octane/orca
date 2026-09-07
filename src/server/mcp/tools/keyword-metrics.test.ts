import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { fetchKeywordMetricsForList as FetchKeywordMetricsForList } from "@/server/lib/dataforseo/keyword-metrics";
import { getKeywordMetricsTool } from "./dataforseo-research-tools";
import { makeToolContext, textContent } from "./tool-test-support";

const mocks = vi.hoisted(() => ({
  createDataforseoClient:
    vi.fn<
      (customer: unknown) => Parameters<typeof FetchKeywordMetricsForList>[0]
    >(),
  getProjectForOrganization: vi.fn(),
}));

vi.mock("cloudflare:workers", () => ({
  env: {},
}));

// FORK: keep the existing normalization fixtures behind the new capability API.
vi.mock("@/server/lib/dataforseo", () => ({
  createDataforseoClient: mocks.createDataforseoClient,
}));
vi.mock("@/server/lib/seo-data", async () => {
  const keywordMetrics = await vi.importActual<{
    fetchKeywordMetricsForList: typeof FetchKeywordMetricsForList;
  }>("@/server/lib/dataforseo/keyword-metrics");
  return {
    fetchKeywordMetrics: (
      input: Parameters<typeof FetchKeywordMetricsForList>[1],
      customer: unknown,
    ) =>
      keywordMetrics.fetchKeywordMetricsForList(
        mocks.createDataforseoClient(customer),
        input,
      ),
  };
});

vi.mock("@/server/features/projects/services/ProjectService", () => ({
  ProjectService: {
    getProjectForOrganization: mocks.getProjectForOrganization,
  },
}));

const toolContext = makeToolContext();

describe("get_keyword_metrics through the SEO capability", () => {
  beforeEach(() => {
    mocks.getProjectForOrganization.mockResolvedValue({
      id: "project_1",
      locationCode: 2840,
      languageCode: "en",
    });
  });

  it("serves Iceland from adsSearchVolume without KD/intent", async () => {
    const keywordOverview = vi.fn();
    const adsSearchVolume = vi.fn().mockResolvedValue([
      {
        keyword: "hotel reykjavik",
        search_volume: 1300,
        cpc: 2.54,
        competition: "HIGH",
        competition_index: 42,
        monthly_searches: [{ year: 2026, month: 5, search_volume: 1300 }],
      },
    ]);

    mocks.createDataforseoClient.mockReturnValue({
      labs: { keywordOverview },
      keywords: { adsSearchVolume },
    });

    const result = await getKeywordMetricsTool.handler(
      {
        projectId: "project_1",
        keywords: ["hotel reykjavik"],
        // Iceland is not supported by DataForSEO Labs.
        locationCode: 2352,
        languageCode: "is",
      },
      toolContext,
    );

    expect(keywordOverview).not.toHaveBeenCalled();
    expect(adsSearchVolume).toHaveBeenCalledWith(
      expect.objectContaining({
        keywords: ["hotel reykjavik"],
        locationCode: 2352,
        languageCode: "is",
        creditFeature: "keyword_research",
      }),
    );
    const rows = z
      .object({ keywords: z.array(z.record(z.string(), z.unknown())) })
      .passthrough()
      .parse(result.structuredContent).keywords;
    expect(rows[0]).toMatchObject({
      keyword: "hotel reykjavik",
      search_volume: 1300,
      keyword_difficulty: null,
      main_intent: null,
      cpc: 2.54,
      competition: 0.42,
      competition_level: "HIGH",
    });
  });

  it("passes the clickstream opt-in to Labs and prefers refined volumes", async () => {
    const keywordOverview = vi.fn().mockResolvedValue([
      {
        keyword: "seo tools",
        keyword_info: {
          search_volume: 10000,
          monthly_searches: [{ year: 2026, month: 5, search_volume: 10000 }],
        },
        keyword_info_normalized_with_clickstream: {
          search_volume: 6400,
          monthly_searches: [{ year: 2026, month: 5, search_volume: 6400 }],
        },
      },
    ]);

    mocks.createDataforseoClient.mockReturnValue({
      labs: { keywordOverview },
      keywords: { adsSearchVolume: vi.fn() },
    });

    const result = await getKeywordMetricsTool.handler(
      {
        projectId: "project_1",
        keywords: ["seo tools"],
        includeClickstreamData: true,
      },
      toolContext,
    );

    expect(keywordOverview).toHaveBeenCalledWith(
      expect.objectContaining({ includeClickstreamData: true }),
    );
    const rows = z
      .object({ keywords: z.array(z.record(z.string(), z.unknown())) })
      .passthrough()
      .parse(result.structuredContent).keywords;
    expect(rows[0]).toMatchObject({
      keyword: "seo tools",
      search_volume: 6400,
      monthly_searches: [{ year: 2026, month: 5, search_volume: 6400 }],
    });
  });
  it("normalizes keyword_overview rows with difficulty and intent", async () => {
    const keywordOverview = vi.fn().mockResolvedValue([
      {
        keyword: "seo automation",
        keyword_info: {
          search_volume: 2400,
          cpc: 25.6,
          competition: 0.24,
          competition_level: "LOW",
        },
        keyword_properties: { keyword_difficulty: 18 },
        search_intent_info: { main_intent: "commercial" },
      },
    ]);

    mocks.createDataforseoClient.mockReturnValue({
      labs: { keywordOverview },
      keywords: { adsSearchVolume: vi.fn() },
    });

    const result = await getKeywordMetricsTool.handler(
      { projectId: "project_1", keywords: ["seo automation"] },
      toolContext,
    );

    expect(keywordOverview).toHaveBeenCalledWith(
      expect.objectContaining({
        keywords: ["seo automation"],
        locationCode: 2840,
        languageCode: "en",
        creditFeature: "keyword_research",
      }),
    );
    const rows = z
      .object({
        keywords: z.array(
          z
            .object({
              keyword: z.string(),
              search_volume: z.number().nullable(),
              keyword_difficulty: z.number().nullable(),
              main_intent: z.string().nullable(),
            })
            .passthrough(),
        ),
      })
      .passthrough()
      .parse(result.structuredContent).keywords;
    expect(rows[0]).toMatchObject({
      keyword: "seo automation",
      search_volume: 2400,
      keyword_difficulty: 18,
      main_intent: "commercial",
    });
    const out = textContent(result);
    expect(out).toContain("keyword | volume | KD | CPC | competition | intent");
    expect(out).toContain("seo automation");
  });

  it("sorts keyword metric rows by the requested numeric field", async () => {
    const keywordOverview = vi.fn().mockResolvedValue([
      { keyword: "low", keyword_info: { search_volume: 10 } },
      { keyword: "high", keyword_info: { search_volume: 90 } },
      { keyword: "medium", keyword_info: { search_volume: 50 } },
    ]);

    mocks.createDataforseoClient.mockReturnValue({
      labs: { keywordOverview },
      keywords: { adsSearchVolume: vi.fn() },
    });

    const result = await getKeywordMetricsTool.handler(
      {
        projectId: "project_1",
        keywords: ["low", "high", "medium"],
        sortBy: "search_volume",
      },
      toolContext,
    );

    const rows = z
      .object({ keywords: z.array(z.object({ keyword: z.string() })) })
      .passthrough()
      .parse(result.structuredContent).keywords;
    expect(rows.map((row) => row.keyword)).toEqual(["high", "medium", "low"]);
  });

  it("drops monthly trends when includeMonthlyTrends is false", async () => {
    const keywordOverview = vi.fn().mockResolvedValue([
      {
        keyword: "seo",
        keyword_info: {
          search_volume: 100,
          monthly_searches: [{ year: 2026, month: 1, search_volume: 100 }],
        },
      },
    ]);

    mocks.createDataforseoClient.mockReturnValue({
      labs: { keywordOverview },
      keywords: { adsSearchVolume: vi.fn() },
    });

    const result = await getKeywordMetricsTool.handler(
      {
        projectId: "project_1",
        keywords: ["seo"],
        includeMonthlyTrends: false,
      },
      toolContext,
    );

    const rows = z
      .object({ keywords: z.array(z.record(z.string(), z.unknown())) })
      .passthrough()
      .parse(result.structuredContent).keywords;
    expect(rows[0]).not.toHaveProperty("monthly_searches");
  });
});
