import { sort } from "remeda";
import { and, eq, inArray, sql } from "drizzle-orm";
import { runBatch } from "@/db/runBatch";
import {
  googleKeywordScopes,
  googleKeywordScopeLocations,
  googleKeywordMetrics,
  googleKeywordMonthlyVolumes,
  googleKeywordCloseVariants,
} from "@/db/schema";
import { buildCacheKey } from "@/server/lib/r2-cache";
import type {
  GoogleKeywordIdeasInput,
  GoogleKeywordResult,
} from "@/types/schemas/google-keywords";

import { jsonRows, jsonField } from "./sql-json";

async function upsertResult(
  input: GoogleKeywordIdeasInput,
  customerId: string,
  result: GoogleKeywordResult,
) {
  if (result.rows.length === 0) return;
  const geoTargetIds = sort([...new Set(input.geoTargetIds)], (a, b) =>
    a.localeCompare(b),
  );
  const scope = {
    projectId: input.projectId,
    customerId,
    languageId: input.languageId,
    network: input.network,
    includeAdultKeywords: input.includeAdultKeywords,
    currencyCode: result.currencyCode,
  };
  // Seeds and page tokens choose candidates; they do not define a metric's
  // market. Reordering locations must not create duplicate metrics.
  const scopeId = await buildCacheKey("google-keyword-scope", {
    ...scope,
    geoTargetIds,
  });
  const payload = JSON.stringify(
    await Promise.all(
      result.rows.map(async (row) => ({
        id: await buildCacheKey("google-keyword-metric", {
          scopeId,
          keyword: row.keyword,
        }),
        keyword: row.keyword,
        searchVolume: row.searchVolume,
        cpc: row.cpc,
        competition: row.competition,
        trend: row.trend,
        closeVariants: row.closeVariants.map((keyword) => ({ keyword })),
      })),
    ),
  );
  const item = sql`item.value`;
  const month = sql`month.value`;
  const variant = sql`variant.value`;
  const incoming = jsonRows(sql`${payload}`);
  const incomingId = jsonField(item, "id");
  const currentIds = sql`(select ${googleKeywordMetrics.id} from ${googleKeywordMetrics}
    where ${googleKeywordMetrics.scopeId} = ${scopeId}
      and ${googleKeywordMetrics.fetchedAt} = ${result.fetchedAt}
      and ${googleKeywordMetrics.id} in (select ${incomingId} from ${incoming} as item))`;
  const accepted = and(
    eq(googleKeywordMetrics.id, incomingId),
    eq(googleKeywordMetrics.scopeId, scopeId),
    eq(googleKeywordMetrics.fetchedAt, result.fetchedAt),
  );

  // Parent metrics and their replacement child rows commit together. A stale
  // cache hit cannot replace a newer metric or its trends/close variants.
  await runBatch((tx) => [
    tx
      .insert(googleKeywordScopes)
      .values({ id: scopeId, ...scope })
      .onConflictDoNothing(),
    tx
      .insert(googleKeywordScopeLocations)
      .values(geoTargetIds.map((geoTargetId) => ({ scopeId, geoTargetId })))
      .onConflictDoNothing(),
    tx
      .insert(googleKeywordMetrics)
      .select(
        sql`
      select ${incomingId}, ${scopeId}, ${jsonField(item, "keyword")},
        ${jsonField(item, "searchVolume", "bigint")},
        ${jsonField(item, "cpc", "double precision")},
        ${jsonField(item, "competition", "double precision")}, ${result.fetchedAt}
      from ${incoming} as item where true
    `,
      )
      .onConflictDoUpdate({
        target: googleKeywordMetrics.id,
        set: {
          searchVolume: sql`excluded.search_volume`,
          cpc: sql`excluded.cpc`,
          competition: sql`excluded.competition`,
          fetchedAt: sql`excluded.fetched_at`,
        },
        setWhere: sql`${googleKeywordMetrics.fetchedAt} <= excluded.fetched_at`,
      }),
    tx
      .delete(googleKeywordMonthlyVolumes)
      .where(inArray(googleKeywordMonthlyVolumes.metricId, currentIds)),
    tx
      .delete(googleKeywordCloseVariants)
      .where(inArray(googleKeywordCloseVariants.metricId, currentIds)),
    tx.insert(googleKeywordMonthlyVolumes).select(sql`
      select ${incomingId}, ${jsonField(month, "year", "bigint")},
        ${jsonField(month, "month", "bigint")}, ${jsonField(month, "searchVolume", "bigint")}
      from ${incoming} as item
      cross join ${jsonRows(jsonField(item, "trend", "json"))} as month
      inner join ${googleKeywordMetrics} on ${accepted}
      where true
    `),
    tx.insert(googleKeywordCloseVariants).select(sql`
      select distinct ${incomingId}, ${jsonField(variant, "keyword")}
      from ${incoming} as item
      cross join ${jsonRows(jsonField(item, "closeVariants", "json"))} as variant
      inner join ${googleKeywordMetrics} on ${accepted}
      where true
    `),
  ]);
}

export const GoogleKeywordRepository = { upsertResult };
