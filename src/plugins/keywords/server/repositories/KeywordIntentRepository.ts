import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  projects,
  googleKeywordSearches as searches,
  googleKeywordSearchRows as rows,
  googleKeywordSearchIntents as intents,
} from "@/db/schema";
import { jsonRows, jsonField } from "./sql-json";
import { AppError } from "@/server/lib/errors";
import { savedKeywordIntentSchema } from "@/types/schemas/keyword-intent";
import type { z } from "zod";
import type { KeywordScope } from "../../contracts";

function owned(searchId: string, scope: KeywordScope) {
  return and(
    eq(searches.id, searchId),
    eq(searches.projectId, scope.projectId),
    eq(projects.organizationId, scope.organizationId),
    isNull(projects.archivedAt),
  );
}
async function getMany(
  searchId: string,
  keywords: string[],
  scope: KeywordScope,
) {
  const found = [];
  // Keep IN lists below D1's bound-parameter limit, including ownership fields.
  for (let offset = 0; offset < keywords.length; offset += 80) {
    const selected = keywords.slice(offset, offset + 80);
    const matches = await db
      .select({ keyword: rows.keyword, decision: intents })
      .from(rows)
      .innerJoin(searches, eq(searches.id, rows.searchId))
      .innerJoin(projects, eq(projects.id, searches.projectId))
      .leftJoin(
        intents,
        and(
          eq(intents.searchId, rows.searchId),
          eq(intents.rowPosition, rows.position),
        ),
      )
      .where(and(owned(searchId, scope), inArray(rows.keyword, selected)));
    const byKeyword = new Map(matches.map((row) => [row.keyword, row]));
    for (const keyword of selected) {
      const row = byKeyword.get(keyword);
      if (!row) throw new AppError("NOT_FOUND");
      found.push({
        keyword,
        decision: row.decision
          ? savedKeywordIntentSchema.parse(row.decision)
          : null,
      });
    }
  }
  return found;
}
async function saveMany(
  searchId: string,
  decisions: (z.infer<typeof savedKeywordIntentSchema> & { keyword: string })[],
  scope: KeywordScope,
) {
  if (!decisions.length) return [];
  // JSON is only a parameter-efficient bulk transport, never persisted as a blob.
  const items = jsonRows(sql`${JSON.stringify(decisions)}`);
  const item = sql`item.value`;
  // Ownership is rechecked in the atomic insert. First successful result wins.
  await db
    .insert(intents)
    .select(
      db
        .select({
          searchId: rows.searchId,
          rowPosition: rows.position,
          intent: jsonField(item, "intent").as("intent"),
          provider: jsonField(item, "provider").as("provider"),
          model: jsonField(item, "model").as("model"),
          promptVersion: jsonField(item, "promptVersion").as("prompt_version"),
          decidedAt: jsonField(item, "decidedAt").as("decided_at"),
        })
        .from(rows)
        .innerJoin(searches, eq(searches.id, rows.searchId))
        .innerJoin(projects, eq(projects.id, searches.projectId))
        .innerJoin(
          sql`${items} as item`,
          eq(rows.keyword, jsonField(item, "keyword")),
        )
        .where(owned(searchId, scope)),
    )
    .onConflictDoNothing();
  const saved = await getMany(
    searchId,
    decisions.map((row) => row.keyword),
    scope,
  );
  return saved.map(({ keyword, decision }) => {
    if (!decision) throw new AppError("CONFLICT");
    return { keyword, ...decision };
  });
}
export const KeywordIntentRepository = { getMany, saveMany };
