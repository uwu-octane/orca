import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { runBatch } from "@/db/runBatch";
import {
  projects,
  googleKeywordSearches as searches,
  googleKeywordSearchSeeds as seeds,
  googleKeywordSearchLocations as locations,
  googleKeywordSearchRows as rows,
  googleKeywordSearchMonths as months,
  googleKeywordSearchVariants as variants,
  googleKeywordSearchIntents as intents,
} from "@/db/schema";
import { buildCacheKey } from "@/server/lib/r2-cache";
import { AppError } from "@/server/lib/errors";
import {
  googleKeywordIdeasSchema,
  googleKeywordResultSchema,
  type GoogleKeywordIdeasInput,
  type GoogleKeywordResult,
} from "@/types/schemas/google-keywords";
import type { KeywordScope } from "../../contracts";
import { jsonRows, jsonField } from "./sql-json";

async function save(
  input: GoogleKeywordIdeasInput,
  customerId: string,
  cacheKey: string,
  result: GoogleKeywordResult,
) {
  const id = await buildCacheKey("google-keyword-search", {
    cacheKey,
    fetchedAt: result.fetchedAt,
  });
  const items = jsonRows(
    sql`${JSON.stringify(result.rows.map((row, position) => ({ ...row, position, closeVariants: row.closeVariants.map((keyword) => ({ keyword })) })))}`,
  );
  const item = sql`item.value`;
  const month = sql`month.value`;
  const variant = sql`variant.value`;
  // Immutable and idempotent, including cache hits. None of these writes touch
  // an existing taxonomy or depend on the lifetime of the provider cache.
  await runBatch((tx) => [
    tx
      .insert(searches)
      .values({
        id,
        projectId: input.projectId,
        customerId,
        languageId: input.languageId,
        network: input.network,
        includeAdultKeywords: input.includeAdultKeywords,
        currencyCode: result.currencyCode,
        fetchedAt: result.fetchedAt,
        pageSize: input.pageSize,
        pageToken: input.pageToken ?? null,
        nextPageToken: result.nextPageToken,
      })
      .onConflictDoNothing(),
    tx
      .insert(seeds)
      .values(
        input.keywords.map((keyword, position) => ({
          searchId: id,
          position,
          keyword,
        })),
      )
      .onConflictDoNothing(),
    tx
      .insert(locations)
      .values(
        [...new Set(input.geoTargetIds)].map((geoTargetId) => ({
          searchId: id,
          geoTargetId,
        })),
      )
      .onConflictDoNothing(),
    tx
      .insert(rows)
      .select(
        sql`select ${id}, ${jsonField(item, "position", "bigint")}, ${jsonField(item, "keyword")}, ${jsonField(item, "searchVolume", "bigint")}, ${jsonField(item, "cpc", "double precision")}, ${jsonField(item, "competition", "double precision")} from ${items} as item where true`,
      )
      .onConflictDoNothing(),
    tx
      .insert(months)
      .select(
        sql`select ${id}, ${jsonField(item, "position", "bigint")}, ${jsonField(month, "year", "bigint")}, ${jsonField(month, "month", "bigint")}, ${jsonField(month, "searchVolume", "bigint")} from ${items} as item cross join ${jsonRows(jsonField(item, "trend", "json"))} as month where true`,
      )
      .onConflictDoNothing(),
    tx
      .insert(variants)
      .select(
        sql`select ${id}, ${jsonField(item, "position", "bigint")}, ${jsonField(variant, "keyword")} from ${items} as item cross join ${jsonRows(jsonField(item, "closeVariants", "json"))} as variant where true`,
      )
      .onConflictDoNothing(),
  ]);
  return { ...result, searchId: id, customerId };
}

async function get(searchId: string, scope: KeywordScope) {
  const [header] = await db
    .select({ search: searches })
    .from(searches)
    .innerJoin(projects, eq(projects.id, searches.projectId))
    .where(
      and(
        eq(searches.id, searchId),
        eq(searches.projectId, scope.projectId),
        eq(projects.organizationId, scope.organizationId),
        isNull(projects.archivedAt),
      ),
    );
  if (!header) throw new AppError("NOT_FOUND");
  const [
    seedRows,
    locationRows,
    keywordRows,
    monthRows,
    variantRows,
    intentRows,
  ] = await Promise.all([
    db
      .select()
      .from(seeds)
      .where(eq(seeds.searchId, searchId))
      .orderBy(asc(seeds.position)),
    db.select().from(locations).where(eq(locations.searchId, searchId)),
    db
      .select()
      .from(rows)
      .where(eq(rows.searchId, searchId))
      .orderBy(asc(rows.position)),
    db
      .select()
      .from(months)
      .where(eq(months.searchId, searchId))
      .orderBy(asc(months.year), asc(months.month)),
    db
      .select()
      .from(variants)
      .where(eq(variants.searchId, searchId))
      .orderBy(asc(variants.keyword)),
    db.select().from(intents).where(eq(intents.searchId, searchId)),
  ]);
  const search = header.search;
  return {
    input: googleKeywordIdeasSchema.parse({
      projectId: scope.projectId,
      keywords: seedRows.map((row) => row.keyword),
      geoTargetIds: locationRows.map((row) => row.geoTargetId),
      languageId: search.languageId,
      network: search.network,
      includeAdultKeywords: search.includeAdultKeywords,
      pageSize: search.pageSize,
      ...(search.pageToken ? { pageToken: search.pageToken } : {}),
    }),
    result: {
      ...googleKeywordResultSchema.parse({
        provider: "google_ads",
        fetchedAt: search.fetchedAt,
        currencyCode: search.currencyCode,
        nextPageToken: search.nextPageToken,
        rows: keywordRows.map((row) => ({
          keyword: row.keyword,
          searchVolume: row.searchVolume,
          cpc: row.cpc,
          competition: row.competition,
          keywordDifficulty: null,
          intent:
            intentRows.find((intent) => intent.rowPosition === row.position)
              ?.intent ?? "unknown",
          ...(intentRows.some((intent) => intent.rowPosition === row.position)
            ? {
                intentDecision: intentRows.find(
                  (intent) => intent.rowPosition === row.position,
                ),
              }
            : {}),
          classification: { status: "not_requested" },
          trend: monthRows
            .filter((month) => month.rowPosition === row.position)
            .map(({ year, month, searchVolume }) => ({
              year,
              month,
              searchVolume,
            })),
          closeVariants: variantRows
            .filter((variant) => variant.rowPosition === row.position)
            .map((variant) => variant.keyword),
        })),
      }),
      searchId,
      customerId: search.customerId,
    },
  };
}

async function list(scope: KeywordScope) {
  const results = await db
    .select({
      searchId: searches.id,
      fetchedAt: searches.fetchedAt,
      languageId: searches.languageId,
      pageSize: searches.pageSize,
      network: searches.network,
      includeAdultKeywords: searches.includeAdultKeywords,
    })
    .from(searches)
    .innerJoin(projects, eq(projects.id, searches.projectId))
    .where(
      and(
        eq(searches.projectId, scope.projectId),
        eq(projects.organizationId, scope.organizationId),
        isNull(projects.archivedAt),
      ),
    )
    .orderBy(desc(searches.fetchedAt), desc(searches.id))
    .limit(20);
  const searchIds = results.map((result) => result.searchId);
  const [seedRows, locationRows] = results.length
    ? await Promise.all([
        db
          .select()
          .from(seeds)
          .where(inArray(seeds.searchId, searchIds))
          .orderBy(asc(seeds.position)),
        db
          .select()
          .from(locations)
          .where(inArray(locations.searchId, searchIds)),
      ])
    : [[], []];
  return results.map((result) => ({
    ...result,
    keywords: seedRows
      .filter((row) => row.searchId === result.searchId)
      .map((row) => row.keyword),
    geoTargetIds: locationRows
      .filter((row) => row.searchId === result.searchId)
      .map((row) => row.geoTargetId),
  }));
}

export const GoogleKeywordSearchRepository = { save, get, list };
