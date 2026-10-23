import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { googleAdsConnections } from "@/db/schema";

type ConnectionInput = Omit<
  typeof googleAdsConnections.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;
async function get(projectId: string, organizationId: string) {
  const [row] = await db
    .select()
    .from(googleAdsConnections)
    .where(
      and(
        eq(googleAdsConnections.projectId, projectId),
        eq(googleAdsConnections.organizationId, organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function save(input: ConnectionInput) {
  const [row] = await db
    .insert(googleAdsConnections)
    .values({ id: crypto.randomUUID(), ...input })
    .onConflictDoUpdate({
      target: googleAdsConnections.projectId,
      set: { ...input, updatedAt: new Date().toISOString() },
    })
    .returning();
  if (!row) throw new Error("Failed to save Google Ads connection");
  return row;
}
async function disconnect(projectId: string, organizationId: string) {
  await db
    .delete(googleAdsConnections)
    .where(
      and(
        eq(googleAdsConnections.projectId, projectId),
        eq(googleAdsConnections.organizationId, organizationId),
      ),
    );
}
export const GoogleAdsConnectionRepository = {
  get,
  save,
  disconnect,
};
