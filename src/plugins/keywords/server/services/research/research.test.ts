import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type { KeywordResearchRow } from "@/types/keywords";
import { EMPTY_FILTERS } from "@/plugins/keywords/client/keywordResearchTypes";
import { applyKeywordFiltersAndSort } from "@/plugins/keywords/client/hooks/useKeywordFiltering";
import { buildCacheKey } from "@/server/lib/r2-cache";
import { createKeywordTestRuntime } from "../../testRuntime";
import { createMeteredDataforseoClient } from "@/plugins/dataforseo/client";
import type { Context } from "cordis";
let runtime: Context;
beforeEach(async () => {
  mocks.cache.clear();
  mocks.fetchRows.mockResolvedValue([]);
  mocks.adsSearchVolume.mockResolvedValue([]);
  mocks.upsertKeywordMetric.mockResolvedValue(undefined);
  runtime = await createKeywordTestRuntime();
  vi.spyOn(runtime.dataforseo, "createClient").mockImplementation(
    (customer) => {
      const client = createMeteredDataforseoClient(customer);
      return {
        ...client,
        keywords: {
          ...client.keywords,
          adsSearchVolume: mocks.adsSearchVolume,
        },
      };
    },
  );
});
afterEach(async () => {
  await runtime.fiber.dispose();
});
import type * as ResearchData from "./research-data";

const mocks = vi.hoisted(() => ({
  cache: new Map<string, string>(),
  fetchRows: vi.fn(),
  adsSearchVolume: vi.fn(),
  upsertKeywordMetric: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("cloudflare:workers", () => ({
  env: {
    R2: {
      get: async (key: string) => {
        const value = mocks.cache.get(key);
        return value === undefined ? null : { text: async () => value };
      },
      put: async (key: string, value: string) => mocks.cache.set(key, value),
    },
    KV: {
      get: async () => [
        {
          locationCode: 1026201,
          locationName: "Austin,Texas,United States",
          locationType: "City",
          displayLabel: "Austin, Texas, United States",
        },
      ],
    },
  },
}));
vi.mock("./research-data", async (importOriginal) => ({
  mapAdsKeywordItems: (await importOriginal<typeof ResearchData>())
    .mapAdsKeywordItems,
  fetchResearchRowsBySource: mocks.fetchRows,
  fetchGoogleAdsResearchRows: vi.fn(),
}));
vi.mock(
  "@/plugins/keywords/server/repositories/KeywordResearchRepository",
  () => ({
    KeywordResearchRepository: {
      upsertKeywordMetric: mocks.upsertKeywordMetric,
    },
  }),
);

const customer = {
  organizationId: "org_1",
  userId: "user_1",
  userEmail: "user@example.com",
};

it("keeps shared-volume keywords independently filterable through research and cache", async () => {
  const seed: KeywordResearchRow = {
    keyword: "caregiving",
    searchVolume: 110000,
    trend: [
      { year: 2026, month: 6, searchVolume: 90500 },
      { year: 2026, month: 7, searchVolume: 110000 },
    ],
    cpc: 8.25,
    competition: 0.4,
    keywordDifficulty: 60,
    intent: "informational",
  };
  const opportunity: KeywordResearchRow = {
    ...seed,
    keyword: "caregiver",
    keywordDifficulty: 20,
    intent: "commercial",
  };
  const siblings = [
    "respite care",
    "elder care",
    "adult day care",
    "care home",
  ].map((keyword) => ({ ...seed, keyword, searchVolume: 500 }));
  mocks.fetchRows.mockImplementation(
    async (_provider, { source, ignoreSynonyms }) =>
      source === "suggestions"
        ? [seed]
        : ignoreSynonyms
          ? siblings
          : [opportunity, ...siblings],
  );
  const input = {
    projectId: "project_1",
    keywords: ["caregiving"],
    locationCode: 2840,
    languageCode: "en",
    resultLimit: 150 as const,
    mode: "auto" as const,
    clickstream: false,
    groupKeywords: true,
  };
  // An older cached grouping must not hide the opportunity after this fix.
  const oldKey = await buildCacheKey("kw:research", {
    ...input,
    cacheVersion: 4,
    organizationId: customer.organizationId,
    depth: 3,
  });
  mocks.cache.set(
    `dataforseo-cache/${oldKey}`,
    JSON.stringify({
      rows: [{ ...seed, closeVariants: [opportunity.keyword] }],
      source: "blended",
      usedFallback: false,
    }),
  );

  const fresh = await runtime.keywords.research(input, customer);
  const cached = await runtime.keywords.research(input, customer);
  expect(mocks.fetchRows).toHaveBeenCalledTimes(2);
  expect(cached).toEqual(fresh);
  expect(fresh.rows).toContainEqual(opportunity);
  expect(fresh.source).toBe("blended");
  expect(mocks.upsertKeywordMetric).toHaveBeenCalledWith(
    expect.objectContaining({
      keyword: "caregiver",
      keywordDifficulty: 20,
      intent: "commercial",
    }),
  );
  const filtered = applyKeywordFiltersAndSort({
    rows: cached.rows,
    filters: { ...EMPTY_FILTERS, maxKd: "30", intents: "commercial" },
    sortField: "keyword",
    sortDir: "asc",
  });
  expect(filtered).toEqual([opportunity]);
  for (const params of mocks.fetchRows.mock.calls.slice(0, 2)) {
    expect(params[1]).toMatchObject({ ignoreSynonyms: false });
  }
  const coreOnly = await runtime.keywords.research(
    { ...input, groupKeywords: false },
    customer,
  );
  // The thin core-only set also exercises the related-keywords fallback.
  expect(mocks.fetchRows).toHaveBeenCalledTimes(5);
  for (const params of mocks.fetchRows.mock.calls.slice(2)) {
    expect(params[1]).toMatchObject({ ignoreSynonyms: true });
  }
  expect(coreOnly.rows).not.toContainEqual(opportunity);
  expect(
    await runtime.keywords.research(
      { ...input, groupKeywords: false },
      customer,
    ),
  ).toEqual(coreOnly);
  expect(await runtime.keywords.research(input, customer)).toEqual(fresh);
  expect(mocks.fetchRows).toHaveBeenCalledTimes(5);
});

const nationalPlumber: KeywordResearchRow = {
  keyword: "plumber",
  searchVolume: 673000,
  trend: [{ year: 2026, month: 8, searchVolume: 673000 }],
  cpc: 34.32,
  competition: 0.1,
  keywordDifficulty: 31,
  intent: "commercial",
};

const localInput = {
  projectId: "project_1",
  keywords: ["plumber"],
  locationCode: 2840,
  languageCode: "en",
  locationName: "Austin,Texas,United States",
  resultLimit: 150 as const,
  mode: "suggestions" as const,
  clickstream: true,
  groupKeywords: false,
};

it("replaces national volume with local volume and never falls back to national", async () => {
  const collapsed = { ...nationalPlumber, keyword: "plumbers" };
  const adsRejected = { ...nationalPlumber, keyword: "plumber (24/7)" };
  mocks.fetchRows.mockResolvedValue([nationalPlumber, collapsed, adsRejected]);
  mocks.adsSearchVolume.mockResolvedValue([
    {
      keyword: "plumber",
      search_volume: 2900,
      cpc: 36.67,
      competition_index: 20,
      monthly_searches: [{ year: 2026, month: 8, search_volume: 2900 }],
    },
  ]);

  const result = await runtime.keywords.research(localInput, customer);

  expect(result.rows).toEqual([
    {
      ...nationalPlumber,
      searchVolume: 2900,
      trend: [{ year: 2026, month: 8, searchVolume: 2900 }],
      cpc: 36.67,
      competition: 0.2,
    },
    ...[collapsed, adsRejected].map((row) => ({
      ...row,
      searchVolume: null,
      trend: [],
      cpc: null,
      competition: null,
    })),
  ]);
  // Local volume replaces clickstream volume, so the national leg skips it.
  expect(mocks.fetchRows.mock.calls[0][1]).toMatchObject({
    includeClickstreamData: false,
  });
  expect(mocks.adsSearchVolume).toHaveBeenCalledWith(
    expect.objectContaining({
      keywords: ["plumber", "plumbers"],
      locationName: "Austin,Texas,United States",
    }),
  );
  // Keyword metrics are stored per country: only national numbers persist.
  expect(mocks.upsertKeywordMetric).toHaveBeenCalledWith(
    expect.objectContaining({ keyword: "plumber", searchVolume: 673000 }),
  );
  expect(mocks.upsertKeywordMetric).not.toHaveBeenCalledWith(
    expect.objectContaining({ searchVolume: 2900 }),
  );

  expect(await runtime.keywords.research(localInput, customer)).toEqual(result);
  expect(mocks.adsSearchVolume).toHaveBeenCalledTimes(1);
});

it("stores national metrics for a local search whose national result is cached", async () => {
  const nationalInput = {
    ...localInput,
    keywords: ["electrician"],
    locationName: undefined,
    clickstream: false,
  };
  mocks.fetchRows.mockResolvedValue([
    { ...nationalPlumber, keyword: "electrician", searchVolume: 90500 },
  ]);
  mocks.adsSearchVolume.mockResolvedValue([]);
  await runtime.keywords.research(nationalInput, customer);
  const callsAfterNational = mocks.upsertKeywordMetric.mock.calls.length;

  await runtime.keywords.research(
    { ...nationalInput, locationName: localInput.locationName },
    customer,
  );

  expect(mocks.fetchRows).toHaveBeenCalledTimes(1);
  expect(
    mocks.upsertKeywordMetric.mock.calls.slice(callsAfterNational),
  ).toEqual([
    [expect.objectContaining({ keyword: "electrician", searchVolume: 90500 })],
  ]);
});

it("rejects a location outside the country's registry before any paid call", async () => {
  await expect(
    runtime.keywords.research(
      { ...localInput, locationName: "Austin, TX" },
      customer,
    ),
  ).rejects.toMatchObject({ code: "UNKNOWN_LOCATION" });
  expect(mocks.fetchRows).not.toHaveBeenCalled();
  expect(mocks.adsSearchVolume).not.toHaveBeenCalled();
});
