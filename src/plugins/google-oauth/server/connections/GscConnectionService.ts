import { GoogleAccountRepository } from "../GoogleAccountRepository";
import type { GoogleAccessToken, GscConnection } from "../../contracts";
import { GSC_OAUTH_PROVIDER_ID } from "@/shared/gsc";
import { AppError } from "@/server/lib/errors";
import { createGscClient, type GscSite } from "@/server/lib/gscClient";
import { GscApiError, isExpectedGrantFailure } from "@/server/lib/gscErrors";
import { GscConnectionRepository } from "./GscConnectionRepository";
const SITE_UNVERIFIED_PERMISSION = "siteUnverifiedUser";
type GscSiteListResult = {
  accounts: Array<{
    accountId: string;
    email: string | null;
    requiresReconnect: boolean;
    propertiesUnavailable: boolean;
    apiDisabled: boolean;
    sites: GscSite[];
  }>;
};

/** Thrown when a project has no connected GSC property. */
export function createGscConnections(getAccessToken: GoogleAccessToken) {
  async function getConnection(
    projectId: string,
  ): Promise<GscConnection | null> {
    return GscConnectionRepository.getByProjectId(projectId);
  }

  /** Whether this user has linked a google-search-console grant (regardless of
   *  whether they've picked a property yet). Drives the connect-vs-pick UI. */
  async function userHasGrant(userId: string): Promise<boolean> {
    return (await listGrantsForUser(userId)).length > 0;
  }

  function listGrantsForUser(userId: string) {
    return GoogleAccountRepository.listGrants(userId, GSC_OAUTH_PROVIDER_ID);
  }

  async function listSitesForUserWithGrantStatus(
    userId: string,
  ): Promise<GscSiteListResult> {
    const grants = await listGrantsForUser(userId);
    const accounts = await Promise.all(
      grants.map(async (grant) => {
        const client = createGscClient({
          userId,
          gscAccountId: grant.accountId,
          getAccessToken: () =>
            getAccessToken({
              userId,
              accountId: grant.accountId,
              providerId: GSC_OAUTH_PROVIDER_ID,
            }),
        });

        try {
          const sites = await client.listSites();
          let email: string | null = null;
          try {
            email = await client.getUserInfoEmail();
          } catch {
            email = null;
          }
          return {
            accountId: grant.accountId,
            email,
            requiresReconnect: false,
            propertiesUnavailable: false,
            apiDisabled: false,
            sites,
          };
        } catch (error) {
          // A disabled API is a self-host setup fault, not a dead grant:
          // reconnecting can't fix it, so log it and show the setup message.
          const apiDisabled = error instanceof GscApiError && error.apiDisabled;
          const requiresReconnect =
            isExpectedGrantFailure(error) && !apiDisabled;
          if (!requiresReconnect) {
            console.error(
              "Failed to list Search Console sites for account",
              grant.accountId,
              error,
            );
          }
          return {
            accountId: grant.accountId,
            email: null,
            requiresReconnect,
            propertiesUnavailable: !requiresReconnect,
            apiDisabled,
            sites: [],
          };
        }
      }),
    );
    return { accounts };
  }

  async function listSites(input: { userId: string; projectId: string }) {
    const [siteList, connection] = await Promise.all([
      listSitesForUserWithGrantStatus(input.userId),
      getConnection(input.projectId),
    ]);
    const legacyAccounts = !connection?.gscAccountId
      ? siteList.accounts.filter((grant) =>
          grant.sites.some((site) => site.siteUrl === connection?.siteUrl),
        )
      : [];
    const unambiguousLegacyAccountId =
      legacyAccounts.length === 1 ? legacyAccounts[0]?.accountId : undefined;
    return {
      accounts: siteList.accounts.map((grant) => ({
        accountId: grant.accountId,
        email: grant.email,
        requiresReconnect: grant.requiresReconnect,
        propertiesUnavailable: grant.propertiesUnavailable,
        apiDisabled: grant.apiDisabled,
        sites: grant.sites.map((site) => {
          const isSelected = connection?.gscAccountId
            ? connection.gscAccountId === grant.accountId &&
              connection.siteUrl === site.siteUrl
            : unambiguousLegacyAccountId === grant.accountId &&
              connection?.siteUrl === site.siteUrl;
          return {
            siteUrl: site.siteUrl,
            permissionLevel: site.permissionLevel,
            selectable: site.permissionLevel !== "siteUnverifiedUser",
            isSelected,
          };
        }),
      })),
    };
  }

  /** Map a verified property to a project. Rejects unverified properties and
   *  properties not present on the connector's grant. */
  async function setSite(input: {
    projectId: string;
    organizationId: string;
    siteUrl: string;
    accountId: string;
    userId: string;
  }): Promise<GscConnection> {
    const grants = await listGrantsForUser(input.userId);
    if (!grants.some((grant) => grant.accountId === input.accountId)) {
      throw new AppError(
        "NOT_FOUND",
        "That Google account isn't connected to your Orca account.",
      );
    }

    const client = createGscClient({
      userId: input.userId,
      gscAccountId: input.accountId,
      getAccessToken: () =>
        getAccessToken({
          userId: input.userId,
          accountId: input.accountId,
          providerId: GSC_OAUTH_PROVIDER_ID,
        }),
    });
    const sites = await client.listSites();
    const match = sites.find((s) => s.siteUrl === input.siteUrl);
    if (!match) {
      throw new AppError(
        "NOT_FOUND",
        "That Search Console property isn't available on your connected Google account.",
      );
    }
    if (match.permissionLevel === SITE_UNVERIFIED_PERMISSION) {
      throw new AppError(
        "FORBIDDEN",
        "You don't have verified access to that Search Console property.",
      );
    }
    let connectedAccountEmail: string | null = null;
    try {
      connectedAccountEmail = await client.getUserInfoEmail();
    } catch {
      connectedAccountEmail = null;
    }
    return GscConnectionRepository.upsert({
      projectId: input.projectId,
      organizationId: input.organizationId,
      siteUrl: input.siteUrl,
      connectedByUserId: input.userId,
      gscAccountId: input.accountId,
      connectedAccountEmail,
    });
  }

  async function disconnect(input: { projectId: string }): Promise<void> {
    await GscConnectionRepository.deleteByProjectId(input.projectId);
  }

  return {
    getConnection,
    userHasGrant,
    listSites,
    setSite,
    disconnect,
  };
}
