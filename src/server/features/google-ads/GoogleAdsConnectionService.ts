import { AppError } from "@/server/lib/errors";
import { isHostedServerAuthMode } from "@/server/lib/runtime-env";
import { GoogleAdsConnectionRepository as repository } from "./GoogleAdsConnectionRepository";
import {
  discoverGoogleAdsCustomers,
  googleAdsAccessToken,
  googleAdsAccountEmail,
} from "./googleAdsClient";

type Project = { projectId: string; organizationId: string };
async function requireAvailable() {
  if (await isHostedServerAuthMode())
    throw new AppError("GOOGLE_ADS_NOT_CONFIGURED");
}
async function getConnection(input: Project) {
  return repository.get(input.projectId, input.organizationId);
}
async function userHasGrant(userId: string) {
  return (await repository.listGrants(userId)).length > 0;
}
async function listAccounts(input: Project & { userId: string }) {
  await requireAvailable();
  const [grants, connection] = await Promise.all([
    repository.listGrants(input.userId),
    getConnection(input),
  ]);
  const accounts = await Promise.all(
    grants.map(async (grant) => {
      try {
        const token = await googleAdsAccessToken(input.userId, grant.accountId);
        const [customers, email] = await Promise.all([
          discoverGoogleAdsCustomers(token),
          googleAdsAccountEmail(token),
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
  const grants = await repository.listGrants(input.userId);
  if (!grants.some((grant) => grant.accountId === input.accountId))
    throw new AppError("NOT_FOUND");
  const token = await googleAdsAccessToken(input.userId, input.accountId);
  // Re-discover on save; the browser cannot forge customer IDs or manager routes.
  const customers = await discoverGoogleAdsCustomers(token);
  const customer = customers.find((item) => item.id === input.propertyId);
  if (!customer) throw new AppError("NOT_FOUND");
  const email = await googleAdsAccountEmail(token);
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
  return { ...connection, accessToken };
}
async function disconnect(input: Project) {
  await requireAvailable();
  await repository.disconnect(input.projectId, input.organizationId);
}
export const GoogleAdsConnectionService = {
  getConnection,
  userHasGrant,
  listAccounts,
  save,
  credentials,
  disconnect,
  requireAvailable,
};
