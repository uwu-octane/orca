import { GoogleAccountRepository } from "../GoogleAccountRepository";
import { AppError } from "@/server/lib/errors";
import { isHostedServerAuthMode } from "@/server/lib/runtime-env";
import { GoogleAdsConnectionRepository as repository } from "./GoogleAdsConnectionRepository";
import type { GoogleAccessToken, GoogleAdsDiscovery } from "../../contracts";
import { GOOGLE_ADS_OAUTH_PROVIDER_ID } from "@/shared/google-ads";

type Project = { projectId: string; organizationId: string };
export function createGoogleAdsConnections(
  getAccessToken: GoogleAccessToken,
  discovery: () => GoogleAdsDiscovery,
  signal: AbortSignal,
) {
  async function googleAdsAccessToken(userId: string, accountId: string) {
    try {
      return await getAccessToken({
        userId,
        accountId,
        providerId: GOOGLE_ADS_OAUTH_PROVIDER_ID,
      });
    } catch {
      throw new AppError("GOOGLE_ADS_RECONNECT_REQUIRED");
    }
  }
  async function requireAvailable() {
    signal.throwIfAborted();
    if (await isHostedServerAuthMode())
      throw new AppError("GOOGLE_ADS_NOT_CONFIGURED");
  }
  async function getConnection(input: Project) {
    signal.throwIfAborted();
    return repository.get(input.projectId, input.organizationId);
  }
  async function userHasGrant(userId: string) {
    signal.throwIfAborted();
    return (
      (
        await GoogleAccountRepository.listGrants(
          userId,
          GOOGLE_ADS_OAUTH_PROVIDER_ID,
        )
      ).length > 0
    );
  }
  async function listAccounts(input: Project & { userId: string }) {
    await requireAvailable();
    const [grants, connection] = await Promise.all([
      GoogleAccountRepository.listGrants(
        input.userId,
        GOOGLE_ADS_OAUTH_PROVIDER_ID,
      ),
      getConnection(input),
    ]);
    const accounts = await Promise.all(
      grants.map(async (grant) => {
        try {
          const token = await googleAdsAccessToken(
            input.userId,
            grant.accountId,
          );
          const [customers, email] = await Promise.all([
            discovery().discoverCustomers(token),
            discovery().accountEmail(token),
          ]);
          return {
            accountId: grant.accountId,
            email,
            requiresReconnect: false,
            unavailable: false,
            properties: customers.map((customer) => ({
              id: customer.id,
              name: customer.name,
              detail:
                customer.customerId === customer.loginCustomerId
                  ? customer.customerId
                  : `${customer.customerId} · MCC ${customer.loginCustomerId}`,
              selectable: true,
              isSelected:
                connection?.googleAccountId === grant.accountId &&
                connection.connectedByUserId === input.userId &&
                connection.customerId === customer.customerId &&
                connection.loginCustomerId === customer.loginCustomerId,
            })),
          };
        } catch (error) {
          // The picker explicitly shows an unavailable/reconnect state; it never
          // substitutes another grant or silently presents an empty account.
          return {
            accountId: grant.accountId,
            email: null,
            properties: [],
            requiresReconnect:
              error instanceof AppError &&
              error.code === "GOOGLE_ADS_RECONNECT_REQUIRED",
            unavailable: !(
              error instanceof AppError &&
              error.code === "GOOGLE_ADS_RECONNECT_REQUIRED"
            ),
          };
        }
      }),
    );
    return { accounts };
  }
  async function save(
    input: Project & { userId: string; accountId: string; propertyId: string },
  ) {
    await requireAvailable();
    const grants = await GoogleAccountRepository.listGrants(
      input.userId,
      GOOGLE_ADS_OAUTH_PROVIDER_ID,
    );
    if (!grants.some((grant) => grant.accountId === input.accountId))
      throw new AppError("NOT_FOUND");
    const token = await googleAdsAccessToken(input.userId, input.accountId);
    // Re-discover on save; the browser cannot forge customer IDs or manager routes.
    const customers = await discovery().discoverCustomers(token);
    const customer = customers.find((item) => item.id === input.propertyId);
    if (!customer) throw new AppError("NOT_FOUND");
    const email = await discovery().accountEmail(token);
    signal.throwIfAborted();
    return repository.save({
      projectId: input.projectId,
      organizationId: input.organizationId,
      customerId: customer.customerId,
      loginCustomerId: customer.loginCustomerId,
      customerName: customer.name,
      connectedByUserId: input.userId,
      googleAccountId: input.accountId,
      connectedAccountEmail: email,
    });
  }
  async function credentials(input: Project) {
    await requireAvailable();
    const connection = await getConnection(input);
    if (!connection) throw new AppError("GOOGLE_ADS_NOT_CONFIGURED");
    const accessToken = await googleAdsAccessToken(
      connection.connectedByUserId,
      connection.googleAccountId,
    );
    signal.throwIfAborted();
    return { ...connection, accessToken };
  }
  async function disconnect(input: Project) {
    await requireAvailable();
    signal.throwIfAborted();
    await repository.disconnect(input.projectId, input.organizationId);
  }
  return {
    getConnection,
    userHasGrant,
    listAccounts,
    save,
    credentials,
    disconnect,
    requireAvailable,
  };
}
