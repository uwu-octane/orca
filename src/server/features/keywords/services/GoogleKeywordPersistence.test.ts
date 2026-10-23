import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { GoogleKeywordResearchService } from "./GoogleKeywordResearchService";
import type {
  GoogleKeywordIdeasInput,
  GoogleKeywordResult,
} from "@/types/schemas/google-keywords";
import type * as R2Cache from "@/server/lib/r2-cache";

// Execute the production repository and migration against real SQLite.
const database = await vi.hoisted(async () => {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const client = createClient({ url: "file::memory:" });
  return { client, db: drizzle(client), statements: 0 };
});
const mocks = vi.hoisted(() => ({
  credentials: vi.fn(),
  fetchIdeas: vi.fn(),
  cache: new Map<string, unknown>(),
}));
vi.mock("cloudflare:workers", () => ({ env: { DATABASE_PROVIDER: "d1" } }));
vi.mock("@/plugins/server/context", () => ({
  getGoogleOAuth: async () => ({ ads: { credentials: mocks.credentials } }),
  getGoogleAds: async () => ({ keywordIdeas: mocks.fetchIdeas }),
}));
vi.mock("@/server/lib/r2-cache", async (importOriginal) => ({
  ...(await importOriginal<typeof R2Cache>()),
  getCached: async (key: string) => mocks.cache.get(key) ?? null,
  setCached: async (key: string, value: unknown) => {
    mocks.cache.set(key, value);
  },
}));
type TestStatement = Parameters<typeof database.db.batch>[0][number] & {
  toSQL: () => { params: unknown[] };
};
vi.mock("@/db/runBatch", () => ({
  runBatch: async (
    build: (tx: typeof database.db) => [TestStatement, ...TestStatement[]],
  ) => {
    const queries = build(database.db);
    for (const query of queries)
      expect(query.toSQL().params.length).toBeLessThanOrEqual(100);
    database.statements += queries.length;
    await database.db.batch(queries);
  },
}));
beforeAll(async () => {
  await database.client.executeMultiple(
    "CREATE TABLE projects (id TEXT PRIMARY KEY);",
  );
  await database.client.executeMultiple(
    readFileSync("drizzle/sqlite/0057_sudden_khan.sql", "utf8"),
  );
});
afterAll(() => database.client.close());
const input: GoogleKeywordIdeasInput = {
  projectId: "project-1",
  keywords: ["coffee"],
  geoTargetIds: ["2840"],
  languageId: "1000",
  network: "GOOGLE_SEARCH",
  includeAdultKeywords: false,
  pageSize: 150,
};
const context = { projectId: "project-1", organizationId: "org-1" };
const credentials = {
  customerId: "123",
  loginCustomerId: "",
  googleAccountId: "google-1",
  connectedByUserId: "user-1",
  updatedAt: "2026-10-22T00:00:00.000Z",
};
function result(
  overrides: Partial<GoogleKeywordResult> = {},
): GoogleKeywordResult {
  return {
    provider: "google_ads",
    fetchedAt: "2026-10-22T00:00:00.000Z",
    currencyCode: "EUR",
    nextPageToken: null,
    rows: [
      {
        keyword: "coffee",
        searchVolume: null,
        cpc: null,
        competition: null,
        trend: [],
        closeVariants: ["coffees"],
        keywordDifficulty: null,
        intent: "unknown",
        classification: { status: "not_requested" },
      },
    ],
    ...overrides,
  };
}
async function rows(query: string) {
  return (await database.client.execute(query)).rows;
}
beforeEach(async () => {
  await database.client.executeMultiple(
    "DELETE FROM projects; INSERT INTO projects VALUES ('project-1'), ('project-2');",
  );
  database.statements = 0;
  mocks.cache.clear();
  mocks.credentials.mockResolvedValue(credentials);
  mocks.fetchIdeas.mockResolvedValue(result());
});

it("persists all returned keywords, including existing cached pages", async () => {
  mocks.fetchIdeas.mockResolvedValue(
    result({
      rows: [
        ...result().rows,
        {
          ...result().rows[0],
          keyword: "coffee beans",
          searchVolume: 0,
          closeVariants: [],
        },
      ],
    }),
  );
  await GoogleKeywordResearchService.research(input, context);
  await database.client.execute("DELETE FROM google_keyword_scopes");
  await GoogleKeywordResearchService.research(input, context);
  expect(mocks.fetchIdeas).toHaveBeenCalledTimes(1);
  expect(
    await rows(
      "SELECT keyword, search_volume, cpc FROM google_keyword_metrics ORDER BY keyword",
    ),
  ).toEqual([
    { keyword: "coffee", search_volume: null, cpc: null },
    { keyword: "coffee beans", search_volume: 0, cpc: null },
  ]);
  expect(
    await rows("SELECT keyword FROM google_keyword_close_variants"),
  ).toEqual([{ keyword: "coffees" }]);
});

it("updates metrics and relations without allowing an older cached query to roll them back", async () => {
  await GoogleKeywordResearchService.research(input, context);
  const latest = result({
    fetchedAt: "2026-10-22T01:00:00.000Z",
    rows: [
      {
        ...result().rows[0],
        searchVolume: 35000,
        cpc: 1.75,
        competition: 0,
        closeVariants: ["fresh coffee"],
        trend: [{ year: 2026, month: 9, searchVolume: 0 }],
      },
    ],
  });
  mocks.fetchIdeas.mockResolvedValue(latest);
  await GoogleKeywordResearchService.research(
    { ...input, keywords: ["espresso"], pageToken: "page-2" },
    context,
  );
  await GoogleKeywordResearchService.research(input, context);
  expect(
    await rows(
      "SELECT keyword, search_volume, cpc, competition, fetched_at FROM google_keyword_metrics",
    ),
  ).toEqual([
    {
      keyword: "coffee",
      search_volume: 35000,
      cpc: 1.75,
      competition: 0,
      fetched_at: latest.fetchedAt,
    },
  ]);
  expect(
    await rows(
      "SELECT year, month, search_volume FROM google_keyword_monthly_volumes",
    ),
  ).toEqual([{ year: 2026, month: 9, search_volume: 0 }]);
  expect(
    await rows("SELECT keyword FROM google_keyword_close_variants"),
  ).toEqual([{ keyword: "fresh coffee" }]);
});

it("stores the complete location combination once regardless of order", async () => {
  await GoogleKeywordResearchService.research(
    { ...input, geoTargetIds: ["2840", "2124"] },
    context,
  );
  await GoogleKeywordResearchService.research(
    { ...input, geoTargetIds: ["2124", "2840", "2840"] },
    context,
  );
  expect(
    await rows("SELECT count(*) AS n FROM google_keyword_metrics"),
  ).toEqual([{ n: 1 }]);
  expect(
    await rows(
      "SELECT geo_target_id FROM google_keyword_scope_locations ORDER BY geo_target_id",
    ),
  ).toEqual([{ geo_target_id: "2124" }, { geo_target_id: "2840" }]);
  await GoogleKeywordResearchService.research(input, context);
  expect(await rows("SELECT count(*) AS n FROM google_keyword_scopes")).toEqual(
    [{ n: 2 }],
  );
});

it("isolates project, customer, language, network, adult setting and currency, with project deletion cascades", async () => {
  await GoogleKeywordResearchService.research(input, context);
  await GoogleKeywordResearchService.research(input, {
    ...context,
    projectId: "project-2",
  });
  await GoogleKeywordResearchService.research(
    { ...input, languageId: "1002" },
    context,
  );
  await GoogleKeywordResearchService.research(
    { ...input, network: "GOOGLE_SEARCH_AND_PARTNERS" },
    context,
  );
  await GoogleKeywordResearchService.research(
    { ...input, includeAdultKeywords: true },
    context,
  );
  mocks.credentials.mockResolvedValue({ ...credentials, customerId: "456" });
  await GoogleKeywordResearchService.research(input, context);
  mocks.fetchIdeas.mockResolvedValue(result({ currencyCode: "USD" }));
  await GoogleKeywordResearchService.research(
    { ...input, keywords: ["espresso"] },
    context,
  );
  expect(
    await rows("SELECT count(*) AS n FROM google_keyword_metrics"),
  ).toEqual([{ n: 7 }]);
  await database.client.execute("DELETE FROM projects WHERE id = 'project-1'");
  expect(await rows("SELECT project_id FROM google_keyword_scopes")).toEqual([
    { project_id: "project-2" },
  ]);
  expect(
    await rows("SELECT count(*) AS n FROM google_keyword_close_variants"),
  ).toEqual([{ n: 1 }]);
});

it("rolls back the page on a child write failure, then persists the cache on a later explicit query", async () => {
  await database.client.executeMultiple(
    "CREATE TRIGGER reject_variant BEFORE INSERT ON google_keyword_close_variants BEGIN SELECT RAISE(ABORT, 'write unavailable'); END;",
  );
  try {
    await expect(
      GoogleKeywordResearchService.research(input, context),
    ).rejects.toThrow();
    expect(
      await rows("SELECT count(*) AS n FROM google_keyword_metrics"),
    ).toEqual([{ n: 0 }]);
    expect(
      await rows("SELECT count(*) AS n FROM google_keyword_scopes"),
    ).toEqual([{ n: 0 }]);
  } finally {
    await database.client.execute("DROP TRIGGER reject_variant");
  }
  await GoogleKeywordResearchService.research(input, context);
  expect(mocks.fetchIdeas).toHaveBeenCalledTimes(1);
  expect(await rows("SELECT keyword FROM google_keyword_metrics")).toEqual([
    { keyword: "coffee" },
  ]);
});

it("writes 500 keywords and their monthly metrics within D1's free-plan query and parameter limits", async () => {
  mocks.fetchIdeas.mockResolvedValue(
    result({
      rows: Array.from({ length: 500 }, (_, i) => ({
        ...result().rows[0],
        keyword: `coffee ${i}`,
        trend: Array.from({ length: 12 }, (_monthValue, month) => ({
          year: 2025,
          month: month + 1,
          searchVolume: 100,
        })),
      })),
    }),
  );
  await GoogleKeywordResearchService.research(
    { ...input, pageSize: 500 },
    context,
  );
  expect(
    await rows("SELECT count(*) AS n FROM google_keyword_metrics"),
  ).toEqual([{ n: 500 }]);
  expect(
    await rows("SELECT count(*) AS n FROM google_keyword_monthly_volumes"),
  ).toEqual([{ n: 6000 }]);
  expect(database.statements).toBeLessThanOrEqual(50);
});
