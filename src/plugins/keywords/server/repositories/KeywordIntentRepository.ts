import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  projects,
  googleKeywordSearches as searches,
  googleKeywordSearchRows as rows,
  googleKeywordSearchIntents as intents,
} from "@/db/schema";
import { AppError } from "@/server/lib/errors";
import { savedKeywordIntentSchema } from "@/types/schemas/keyword-intent";
import type { z } from "zod";
import type { KeywordScope } from "../../contracts";

function owned(searchId: string, keyword: string, scope: KeywordScope) {
  return and(
    eq(searches.id, searchId),
    eq(rows.keyword, keyword),
    eq(searches.projectId, scope.projectId),
    eq(projects.organizationId, scope.organizationId),
    isNull(projects.archivedAt),
  );
}
async function get(searchId: string, keyword: string, scope: KeywordScope) {
  const [row] = await db
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
    .where(owned(searchId, keyword, scope));
  if (!row) throw new AppError("NOT_FOUND");
  return {
    keyword: row.keyword,
    decision: row.decision
      ? savedKeywordIntentSchema.parse(row.decision)
      : null,
  };
}
async function save(
  searchId: string,
  keyword: string,
  scope: KeywordScope,
  decision: z.infer<typeof savedKeywordIntentSchema>,
) {
  // Recheck ownership in the write. First successful decision wins, so a
  // concurrent click cannot replace a result that another client already saved.
  await db
    .insert(intents)
    .select(
      db
        .select({
          searchId: rows.searchId,
          rowPosition: rows.position,
          intent: sql<string>`${decision.intent}`.as("intent"),
          provider: sql<string>`${decision.provider}`.as("provider"),
          model: sql<string>`${decision.model}`.as("model"),
          promptVersion: sql<string>`${decision.promptVersion}`.as(
            "prompt_version",
          ),
          decidedAt: sql<string>`${decision.decidedAt}`.as("decided_at"),
        })
        .from(rows)
        .innerJoin(searches, eq(searches.id, rows.searchId))
        .innerJoin(projects, eq(projects.id, searches.projectId))
        .where(owned(searchId, keyword, scope)),
    )
    .onConflictDoNothing();
  const result = await get(searchId, keyword, scope);
  if (!result.decision) throw new AppError("CONFLICT");
  return result.decision;
}
export const KeywordIntentRepository = { get, save };
