import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { GoogleKeywordResearchService } from "./GoogleKeywordResearchService";
import type { GoogleKeywordIdeasInput } from "@/types/schemas/google-keywords";

// Persistence has its own service-level tests against real SQL.
vi.mock("../repositories/GoogleKeywordRepository", () => ({
  GoogleKeywordRepository: { upsertResult: async () => undefined },
}));

const mocks = vi.hoisted(() => ({
  getConnection: vi.fn(),
  getToken: vi.fn(),
  objects: new Map<
    string,
    { body: string; customMetadata: Record<string, string> }
  >(),
  fetch: vi.fn<typeof fetch>(),
  hosted: false,
}));

vi.mock("@/server/lib/runtime-env", () => ({
  isHostedServerAuthMode: async () => mocks.hosted,
}));
vi.mock("@/server/features/google-ads/GoogleAdsConnectionRepository", () => ({
  GoogleAdsConnectionRepository: { get: mocks.getConnection },
}));
vi.mock("@/server/features/google/googleOAuth", () => ({
  getGoogleAccessToken: mocks.getToken,
}));
const connection = {
  id: "connection-1",
  projectId: "project-1",
  organizationId: "org-1",
  customerId: "1234567890",
  loginCustomerId: "0987654321",
  connectedByUserId: "owner-1",
  googleAccountId: "google-1",
  updatedAt: "2026-10-22T00:00:00Z",
};
vi.mock("cloudflare:workers", () => ({
  env: {
    R2: {
      get: async (key: string) => {
        const object = mocks.objects.get(key);
        return object
          ? {
              text: async () => object.body,
              customMetadata: object.customMetadata,
            }
          : null;
      },
      put: async (
        key: string,
        body: string,
        options: { customMetadata: Record<string, string> },
      ) => {
        mocks.objects.set(key, {
          body,
          customMetadata: options.customMetadata,
        });
      },
    },
  },
}));

const input: GoogleKeywordIdeasInput = {
  projectId: "project-1",
  keywords: ["coffee"],
  geoTargetIds: ["2840"],
  languageId: "1000",
  network: "GOOGLE_SEARCH",
  includeAdultKeywords: false,
  pageSize: 150,
};
const context = { organizationId: "org-1", projectId: "project-1" };
function requestUrl(target: RequestInfo | URL) {
  if (typeof target === "string") return target;
  return target instanceof URL ? target.href : target.url;
}

function defaultResponse(url: RequestInfo | URL) {
  if (requestUrl(url) === "https://oauth2.googleapis.com/token") {
    return Response.json({ access_token: "test-access-token" });
  }
  if (requestUrl(url).endsWith("/googleAds:search")) {
    return Response.json({ results: [{ customer: { currencyCode: "EUR" } }] });
  }
  return Response.json({
    results: [{ text: "coffee", closeVariants: ["coffees"] }],
    nextPageToken: "page-2",
  });
}

beforeEach(() => {
  mocks.hosted = false;
  mocks.objects.clear();
  mocks.getConnection.mockResolvedValue({ ...connection });
  mocks.getToken.mockResolvedValue("test-access-token");
  mocks.fetch.mockImplementation(async (url) => defaultResponse(url));
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => vi.unstubAllGlobals());

describe("Google keyword research", () => {
  it("uses Ads targeting and read metrics without inventing difficulty, CPC or classification", async () => {
    mocks.fetch.mockImplementation(async (url) => {
      if (!requestUrl(url).endsWith(":generateKeywordIdeas"))
        return defaultResponse(url);
      return Response.json({
        results: [
          {
            text: "coffee",
            closeVariants: ["coffees"],
            keywordIdeaMetrics: {
              avgMonthlySearches: "0",
              averageCpcMicros: "1250000",
              competitionIndex: "80",
              monthlySearchVolumes: [
                { year: "2026", month: "SEPTEMBER", monthlySearches: "0" },
                { year: "2026", month: "OCTOBER" },
              ],
            },
          },
          {
            text: "coffee machine",
            keywordIdeaMetrics: { lowTopOfPageBidMicros: "9000000" },
          },
        ],
      });
    });
    const result = await GoogleKeywordResearchService.research(input, context);
    expect(result.currencyCode).toBe("EUR");
    expect(result.rows).toEqual([
      {
        keyword: "coffee",
        closeVariants: ["coffees"],
        searchVolume: 0,
        cpc: 1.25,
        competition: 0.8,
        keywordDifficulty: null,
        intent: "unknown",
        trend: [{ year: 2026, month: 9, searchVolume: 0 }],
        classification: { status: "not_requested" },
      },
      {
        keyword: "coffee machine",
        closeVariants: [],
        searchVolume: null,
        cpc: null,
        competition: null,
        keywordDifficulty: null,
        intent: "unknown",
        trend: [],
        classification: { status: "not_requested" },
      },
    ]);
  });

  it("requests one page with explicit targeting and preserves the continuation token", async () => {
    const result = await GoogleKeywordResearchService.research(
      {
        ...input,
        keywords: ["coffee", "espresso"],
        geoTargetIds: ["2826", "2124"],
        languageId: "1002",
        network: "GOOGLE_SEARCH_AND_PARTNERS",
        includeAdultKeywords: true,
        pageToken: "page-1",
      },
      context,
    );
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    const [url, request] = mocks.fetch.mock.calls[1];
    expect(url).toBe(
      "https://googleads.googleapis.com/v25/customers/1234567890:generateKeywordIdeas",
    );
    expect(request?.headers).toMatchObject({
      "login-customer-id": "0987654321",
    });
    if (typeof request?.body !== "string")
      throw new Error("Expected JSON body");
    expect(JSON.parse(request.body)).toEqual({
      keywordSeed: { keywords: ["coffee", "espresso"] },
      geoTargetConstants: [
        "geoTargetConstants/2826",
        "geoTargetConstants/2124",
      ],
      language: "languageConstants/1002",
      keywordPlanNetwork: "GOOGLE_SEARCH_AND_PARTNERS",
      includeAdultKeywords: true,
      pageSize: 150,
      pageToken: "page-1",
      historicalMetricsOptions: { includeAverageCpc: true },
    });
    expect(result.nextPageToken).toBe("page-2");
  });

  it("reuses persisted empty results and isolates tenant, project, market, page and Ads account", async () => {
    mocks.fetch.mockImplementation(async (url) =>
      requestUrl(url).endsWith(":generateKeywordIdeas")
        ? Response.json({})
        : defaultResponse(url),
    );
    const first = await GoogleKeywordResearchService.research(input, context);
    expect(first.rows).toEqual([]);
    expect(await GoogleKeywordResearchService.research(input, context)).toEqual(
      first,
    );
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    await GoogleKeywordResearchService.research(input, {
      ...context,
      organizationId: "org-2",
    });
    await GoogleKeywordResearchService.research(input, {
      ...context,
      projectId: "project-2",
    });
    await GoogleKeywordResearchService.research(
      { ...input, languageId: "1002" },
      context,
    );
    await GoogleKeywordResearchService.research(
      { ...input, pageToken: "page-2" },
      context,
    );
    mocks.getConnection.mockResolvedValue({
      ...connection,
      customerId: "9876543210",
    });
    await GoogleKeywordResearchService.research(input, context);
    expect(mocks.objects.size).toBe(6);
    expect(mocks.fetch).toHaveBeenCalledTimes(12);
    expect(
      [...mocks.objects.keys()].every((key) =>
        key.startsWith("dataforseo-cache/kw:google-ads:"),
      ),
    ).toBe(true);
  });

  it.each([
    { status: 429, body: {}, code: "RATE_LIMITED" },
    { status: 403, body: {}, code: "GOOGLE_ADS_REQUEST_FAILED" },
    {
      status: 200,
      body: {
        results: [
          {
            text: "coffee",
            keywordIdeaMetrics: { avgMonthlySearches: "invalid" },
          },
        ],
      },
      code: "GOOGLE_ADS_REQUEST_FAILED",
    },
  ])(
    "does not cache or retry an unsuccessful provider response ($status, $code)",
    async ({ status, body, code }) => {
      mocks.fetch.mockImplementation(async (url) =>
        requestUrl(url).endsWith(":generateKeywordIdeas")
          ? Response.json(body, { status })
          : defaultResponse(url),
      );
      await expect(
        GoogleKeywordResearchService.research(input, context),
      ).rejects.toMatchObject({ code });
      expect(mocks.objects.size).toBe(0);
      expect(mocks.fetch).toHaveBeenCalledTimes(2);
    },
  );

  it("rejects hosted use before accessing a grant", async () => {
    mocks.hosted = true;
    await expect(
      GoogleKeywordResearchService.research(input, context),
    ).rejects.toMatchObject({ code: "GOOGLE_ADS_NOT_CONFIGURED" });
    expect(mocks.getToken).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("does not return cached results after the project's connection is removed", async () => {
    await GoogleKeywordResearchService.research(input, context);
    mocks.getConnection.mockResolvedValue(null);
    await expect(
      GoogleKeywordResearchService.research(input, context),
    ).rejects.toMatchObject({ code: "GOOGLE_ADS_NOT_CONFIGURED" });
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it("does not serve cached results with a revoked authorization", async () => {
    await GoogleKeywordResearchService.research(input, context);
    mocks.getToken.mockRejectedValue(new Error("expired"));
    await expect(
      GoogleKeywordResearchService.research(input, context),
    ).rejects.toMatchObject({ code: "GOOGLE_ADS_RECONNECT_REQUIRED" });
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
});
