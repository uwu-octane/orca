import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { account, googleAdsConnections } from "@/db/schema";
import { GOOGLE_ADS_OAUTH_PROVIDER_ID } from "@/shared/google-ads";

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
async function listGrants(userId: string) {
  return db
    .select({ accountId: account.accountId })
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        eq(account.providerId, GOOGLE_ADS_OAUTH_PROVIDER_ID),
      ),
    );
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
  listGrants,
  save,
  disconnect,
};
