import type { AiProvider } from "@/types/schemas/ai-provider";
import { and, eq, getTableColumns, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { aiProviderConfigs, projects } from "@/db/schema";

export type AiProviderScope = { organizationId: string; projectId: string };

function projectInScope(scope: AiProviderScope) {
  return db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.id, scope.projectId),
        eq(projects.organizationId, scope.organizationId),
        isNull(projects.archivedAt),
      ),
    );
}

async function get(scope: AiProviderScope, provider: AiProvider) {
  const [row] = await db
    .select(getTableColumns(aiProviderConfigs))
    .from(aiProviderConfigs)
    .where(
      and(
        inArray(aiProviderConfigs.projectId, projectInScope(scope)),
        eq(aiProviderConfigs.provider, provider),
      ),
    );
  return row ?? null;
}

async function save(
  scope: AiProviderScope,
  values: typeof aiProviderConfigs.$inferInsert,
  revision: string | null,
) {
  if (revision === null) {
    // The service has verified project ownership before an initial insert.
    return db
      .insert(aiProviderConfigs)
      .values(values)
      .onConflictDoNothing()
      .returning({ revision: aiProviderConfigs.revision });
  }
  return db
    .update(aiProviderConfigs)
    .set(values)
    .where(
      and(
        inArray(aiProviderConfigs.projectId, projectInScope(scope)),
        eq(aiProviderConfigs.revision, revision),
        eq(aiProviderConfigs.provider, values.provider),
      ),
    )
    .returning({ revision: aiProviderConfigs.revision });
}

async function hasProject(scope: AiProviderScope) {
  return (await projectInScope(scope)).length > 0;
}

async function remove(
  scope: AiProviderScope,
  provider: AiProvider,
  revision: string,
) {
  return db
    .delete(aiProviderConfigs)
    .where(
      and(
        inArray(aiProviderConfigs.projectId, projectInScope(scope)),
        eq(aiProviderConfigs.revision, revision),
        eq(aiProviderConfigs.provider, provider),
      ),
    )
    .returning({ revision: aiProviderConfigs.revision });
}

async function recordUse(
  scope: AiProviderScope,
  provider: AiProvider,
  revision: string,
) {
  return db
    .update(aiProviderConfigs)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(
      and(
        inArray(aiProviderConfigs.projectId, projectInScope(scope)),
        eq(aiProviderConfigs.provider, provider),
        eq(aiProviderConfigs.revision, revision),
      ),
    )
    .returning({ revision: aiProviderConfigs.revision });
}

export const AiProviderConfigRepository = {
  recordUse,
  get,
  save,
  hasProject,
  remove,
} as const;
