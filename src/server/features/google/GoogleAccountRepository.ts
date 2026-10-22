import { GOOGLE_ADS_OAUTH_PROVIDER_ID } from "@/shared/google-ads";
import { and, count, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { runBatch } from "@/db/runBatch";
import {
  account,
  ga4Connections,
  gscConnections,
  googleAdsConnections,
} from "@/db/schema";
import { GA4_OAUTH_PROVIDER_ID } from "@/shared/ga4";
import { GSC_OAUTH_PROVIDER_ID } from "@/shared/gsc";

type AccountInput = {
  userId: string;
  provider: "gsc" | "ga4" | "google_ads";
  accountId: string;
};

function scope(input: AccountInput) {
  const gsc = input.provider === "gsc";
  const ads = input.provider === "google_ads";
  const connections = ads
    ? googleAdsConnections
    : gsc
      ? gscConnections
      : ga4Connections;
  return {
    connections,
    grant: and(
      eq(account.userId, input.userId),
      eq(
        account.providerId,
        ads
          ? GOOGLE_ADS_OAUTH_PROVIDER_ID
          : gsc
            ? GSC_OAUTH_PROVIDER_ID
            : GA4_OAUTH_PROVIDER_ID,
      ),
      eq(account.accountId, input.accountId),
    ),
    usage: and(
      eq(connections.connectedByUserId, input.userId),
      ads
        ? eq(googleAdsConnections.googleAccountId, input.accountId)
        : gsc
          ? // Legacy GSC mappings can use any of this user's grants.
            or(
              eq(gscConnections.gscAccountId, input.accountId),
              isNull(gscConnections.gscAccountId),
            )
          : eq(ga4Connections.ga4AccountId, input.accountId),
    ),
  };
}

async function getRemovalImpact(input: AccountInput) {
  const { connections, usage } = scope(input);
  const [result] = await db
    .select({ projectCount: count() })
    .from(connections)
    .where(usage);
  return { projectCount: result?.projectCount ?? 0 };
}

async function remove(input: AccountInput) {
  const { connections, grant, usage } = scope(input);
  // Atomic on D1 and Postgres: never leave a partial account removal.
  // Both deletes are scoped to the authenticated owner, including on retries
  // after this Google identity has been linked to a different OpenSEO user.
  await runBatch((tx) => [
    tx.delete(connections).where(usage),
    tx.delete(account).where(grant),
  ]);
}

export const GoogleAccountRepository = { getRemovalImpact, remove };
