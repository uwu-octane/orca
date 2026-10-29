import { getGoogleAccessMode } from "../googleAccess";
import {
  GATEWAY_GOOGLE_ACCOUNT_ID,
  getGatewayGoogleStatus,
} from "../gatewayGoogle";
import { GoogleAccountRepository } from "../GoogleAccountRepository";
import type { GoogleAccessToken, Ga4Connection } from "../../contracts";
import { AppError } from "@/server/lib/errors";
import { createGa4AdminClient } from "@/server/lib/ga4Client";
import { Ga4AdminApiError, Ga4TokenError } from "@/server/lib/ga4Errors";
import { GA4_OAUTH_PROVIDER_ID } from "@/shared/ga4";
import { Ga4ConnectionRepository } from "@/plugins/google-oauth/server/connections/Ga4ConnectionRepository";

export function createGa4Connections(
  getAccessToken: GoogleAccessToken,
  signal: AbortSignal,
  getGatewayFetch: () => Promise<typeof fetch | null>,
) {
  async function getConnection(
    projectId: string,
  ): Promise<Ga4Connection | null> {
    signal.throwIfAborted();
    return Ga4ConnectionRepository.getByProjectId(projectId);
  }

  async function listGrantsForUser(userId: string) {
    signal.throwIfAborted();
    if ((await getGoogleAccessMode()) === "gateway") {
      return (await getGatewayGoogleStatus()).connected
        ? [
            {
              id: GATEWAY_GOOGLE_ACCOUNT_ID,
              accountId: GATEWAY_GOOGLE_ACCOUNT_ID,
            },
          ]
        : [];
    }
    return GoogleAccountRepository.listGrants(userId, GA4_OAUTH_PROVIDER_ID);
  }

  async function userHasGrant(userId: string): Promise<boolean> {
    const grants = await listGrantsForUser(userId);
    return grants.length > 0;
  }

  function requiresReconnect(error: unknown): boolean {
    return (
      error instanceof Ga4TokenError ||
      (error instanceof Ga4AdminApiError && error.status === 401)
    );
  }

  async function listPropertiesForUserWithGrantStatus(userId: string) {
    const grants = await listGrantsForUser(userId);
    const accounts = await Promise.all(
      grants.map(async (grant) => {
        const client = createGa4AdminClient({
          getGatewayFetch,
          signal,
          userId,
          ga4AccountId: grant.accountId,
          getAccessToken: () =>
            getAccessToken({
              userId,
              accountId: grant.accountId,
              providerId: GA4_OAUTH_PROVIDER_ID,
            }),
        });
        try {
          const properties = await client.listProperties();
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
            properties,
          };
        } catch (error) {
          const reconnect = requiresReconnect(error);
          if (!reconnect) {
            console.error("ga4.property_discovery_failed", {
              errorName: error instanceof Error ? error.name : "UnknownError",
              status:
                error instanceof Ga4AdminApiError ? error.status : undefined,
            });
          }
          return {
            accountId: grant.accountId,
            email: null,
            requiresReconnect: reconnect,
            propertiesUnavailable: !reconnect,
            properties: [],
          };
        }
      }),
    );
    return { accounts };
  }

  async function listProperties(input: { userId: string; projectId: string }) {
    const [propertyList, connection] = await Promise.all([
      listPropertiesForUserWithGrantStatus(input.userId),
      getConnection(input.projectId),
    ]);
    return {
      accounts: propertyList.accounts.map((grant) => ({
        ...grant,
        properties: grant.properties.map((property) => ({
          ...property,
          isSelected:
            connection?.ga4AccountId === grant.accountId &&
            connection.propertyId === property.propertyId,
        })),
      })),
    };
  }

  async function setProperty(input: {
    projectId: string;
    organizationId: string;
    propertyId: string;
    accountId: string;
    userId: string;
  }): Promise<Ga4Connection> {
    const grants = await listGrantsForUser(input.userId);
    if (!grants.some((grant) => grant.accountId === input.accountId)) {
      throw new AppError(
        "NOT_FOUND",
        "That Google account isn't connected to your Orca account.",
      );
    }

    const client = createGa4AdminClient({
      getGatewayFetch,
      signal,
      userId: input.userId,
      ga4AccountId: input.accountId,
      getAccessToken: () =>
        getAccessToken({
          userId: input.userId,
          accountId: input.accountId,
          providerId: GA4_OAUTH_PROVIDER_ID,
        }),
    });
    const properties = await client.listProperties();
    if (
      !properties.some((property) => property.propertyId === input.propertyId)
    ) {
      throw new AppError(
        "NOT_FOUND",
        "That Google Analytics property isn't available on your connected Google account.",
      );
    }

    const property = await client.getProperty(input.propertyId);
    let connectedAccountEmail: string | null = null;
    try {
      connectedAccountEmail = await client.getUserInfoEmail();
    } catch {
      connectedAccountEmail = null;
    }

    signal.throwIfAborted();
    return Ga4ConnectionRepository.upsert({
      projectId: input.projectId,
      organizationId: input.organizationId,
      propertyId: property.name,
      propertyDisplayName: property.displayName,
      propertyTimeZone: property.timeZone,
      propertyCurrencyCode: property.currencyCode,
      connectedByUserId: input.userId,
      ga4AccountId: input.accountId,
      connectedAccountEmail,
    });
  }

  async function disconnect(input: { projectId: string }): Promise<void> {
    signal.throwIfAborted();
    await Ga4ConnectionRepository.deleteByProjectId(input.projectId);
  }

  return {
    getConnection,
    userHasGrant,
    listProperties,
    setProperty,
    disconnect,
  };
}
