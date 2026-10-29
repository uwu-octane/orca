import { and, asc, eq, exists, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { runBatch } from "@/db/runBatch";
import {
  projects,
  googleKeywordSearches as searches,
  keywordResearchDimensions as dimensions,
  keywordResearchSubdimensions as children,
} from "@/db/schema";
import { AppError } from "@/server/lib/errors";
import type { KeywordDimension } from "@/types/schemas/keyword-dimensions";
import type { KeywordScope } from "../../contracts";
import { jsonRows, jsonField } from "./sql-json";

function scopeCondition(searchId: string, scope: KeywordScope) {
  return and(
    eq(searches.id, searchId),
    eq(searches.projectId, scope.projectId),
    exists(
      db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.id, scope.projectId),
            eq(projects.organizationId, scope.organizationId),
            isNull(projects.archivedAt),
          ),
        ),
    ),
  );
}
async function get(searchId: string, scope: KeywordScope) {
  // One statement reads revision + the entire taxonomy consistently.
  const rows = await db
    .select({
      revision: searches.dimensionRevision,
      dimension: dimensions,
      child: children,
    })
    .from(searches)
    .leftJoin(dimensions, eq(dimensions.searchId, searches.id))
    .leftJoin(
      children,
      and(
        eq(children.searchId, dimensions.searchId),
        eq(children.dimensionId, dimensions.id),
      ),
    )
    .where(scopeCondition(searchId, scope))
    .orderBy(asc(dimensions.position), asc(children.position));
  if (!rows.length) throw new AppError("NOT_FOUND");
  const fields = new Map<string, KeywordDimension>();
  for (const { dimension, child } of rows) {
    if (!dimension) continue;
    let entry = fields.get(dimension.id);
    if (!entry) {
      entry = {
        id: dimension.id,
        name: dimension.name,
        labelZh: dimension.labelZh,
        children: [],
      };
      fields.set(dimension.id, entry);
    }
    if (child)
      entry.children.push({
        id: child.id,
        name: child.name,
        labelZh: child.labelZh,
        active: child.active,
        ...(child.decisionInstructions !== null
          ? {
              decision: {
                instructions: child.decisionInstructions,
                ...(child.decisionTrue !== null && child.decisionFalse !== null
                  ? {
                      criteria: {
                        true: child.decisionTrue,
                        false: child.decisionFalse,
                      },
                    }
                  : {}),
              },
            }
          : {}),
      });
  }
  return {
    searchId,
    revision: rows[0].revision,
    dimensions: [...fields.values()],
  };
}

async function save(
  searchId: string,
  revision: string | null,
  fields: KeywordDimension[],
  scope: KeywordScope,
) {
  const nextRevision = crypto.randomUUID();
  const source = jsonRows(
    sql`${JSON.stringify(fields.map((field, position) => ({ ...field, position, children: field.children.map((child, childPosition) => ({ ...child, position: childPosition })) })))}`,
  );
  const item = sql`item.value`;
  const child = sql`child.value`;
  // Claim the revision before touching children. Every write checks the claim
  // inside the same transaction, so a stale editor or generation writes nothing.
  const claimed = sql`exists (select 1 from ${searches} where ${searches.id} = ${searchId} and ${searches.dimensionRevision} = ${nextRevision})`;
  await runBatch((tx) => [
    tx
      .update(searches)
      .set({ dimensionRevision: nextRevision })
      .where(
        and(
          scopeCondition(searchId, scope),
          revision === null
            ? isNull(searches.dimensionRevision)
            : eq(searches.dimensionRevision, revision),
        ),
      ),
    tx
      .delete(dimensions)
      .where(and(eq(dimensions.searchId, searchId), claimed)),
    tx
      .insert(dimensions)
      .select(
        sql`select ${searchId}, ${jsonField(item, "id")}, ${jsonField(item, "position", "bigint")}, ${jsonField(item, "name")}, ${jsonField(item, "labelZh")} from ${source} as item where ${claimed}`,
      ),
    tx
      .insert(children)
      .select(
        sql`select ${searchId}, ${jsonField(item, "id")}, ${jsonField(child, "id")}, ${jsonField(child, "position", "bigint")}, ${jsonField(child, "name")}, ${jsonField(child, "labelZh")}, ${jsonField(child, "active", "boolean")}, ${jsonField(jsonField(child, "decision", "json"), "instructions")}, ${jsonField(jsonField(jsonField(child, "decision", "json"), "criteria", "json"), "true")}, ${jsonField(jsonField(jsonField(child, "decision", "json"), "criteria", "json"), "false")} from ${source} as item cross join ${jsonRows(jsonField(item, "children", "json"))} as child where ${claimed}`,
      ),
  ]);
  const saved = await get(searchId, scope);
  if (saved.revision !== nextRevision) throw new AppError("CONFLICT");
  return saved;
}

export const KeywordDimensionRepository = { get, save };
