import { expect, it } from "vitest";
import {
  runtime,
  database,
  mocks,
  input,
  context,
  credentials,
  result,
  rows,
} from "./googleKeywordTestSetup";

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
  await runtime.keywords.researchGoogle(input, context);
  await database.client.execute("DELETE FROM google_keyword_scopes");
  await runtime.keywords.researchGoogle(input, context);
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
  await runtime.keywords.researchGoogle(input, context);
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
  await runtime.keywords.researchGoogle(
    { ...input, keywords: ["espresso"], pageToken: "page-2" },
    context,
  );
  await runtime.keywords.researchGoogle(input, context);
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
  await runtime.keywords.researchGoogle(
    { ...input, geoTargetIds: ["2840", "2124"] },
    context,
  );
  await runtime.keywords.researchGoogle(
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
  await runtime.keywords.researchGoogle(input, context);
  expect(await rows("SELECT count(*) AS n FROM google_keyword_scopes")).toEqual(
    [{ n: 2 }],
  );
});

it("isolates project, customer, language, network, adult setting and currency, with project deletion cascades", async () => {
  await runtime.keywords.researchGoogle(input, context);
  await runtime.keywords.researchGoogle(input, {
    ...context,
    projectId: "project-2",
  });
  await runtime.keywords.researchGoogle(
    { ...input, languageId: "1002" },
    context,
  );
  await runtime.keywords.researchGoogle(
    { ...input, network: "GOOGLE_SEARCH_AND_PARTNERS" },
    context,
  );
  await runtime.keywords.researchGoogle(
    { ...input, includeAdultKeywords: true },
    context,
  );
  mocks.credentials.mockResolvedValue({ ...credentials, customerId: "456" });
  await runtime.keywords.researchGoogle(input, context);
  mocks.fetchIdeas.mockResolvedValue(result({ currencyCode: "USD" }));
  await runtime.keywords.researchGoogle(
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
      runtime.keywords.researchGoogle(input, context),
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
  await runtime.keywords.researchGoogle(input, context);
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
  await runtime.keywords.researchGoogle({ ...input, pageSize: 500 }, context);
  expect(
    await rows("SELECT count(*) AS n FROM google_keyword_metrics"),
  ).toEqual([{ n: 500 }]);
  expect(
    await rows("SELECT count(*) AS n FROM google_keyword_monthly_volumes"),
  ).toEqual([{ n: 6000 }]);
  expect(database.statements).toBeLessThanOrEqual(50);
});
