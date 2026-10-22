import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  requireAuthenticatedContext,
  requireProjectContext,
} from "@/serverFunctions/middleware";
import { hasOrgPermission } from "@/lib/org-permissions";
import { requireOrgPermission } from "@/server/auth/org-gate";
import { hasGoogleOAuthConfig } from "@/server/features/google/oauth-config";
import {
  createGoogleAuthorizationUrl,
  GOOGLE_ADS_INTEGRATION,
} from "@/server/features/google/googleOAuth";
import { GoogleAdsConnectionService as service } from "@/server/features/google-ads/GoogleAdsConnectionService";
import { isHostedServerAuthMode } from "@/server/lib/runtime-env";
import { getPublicOrigin } from "@/server/mcp/public-origin";

const projectSchema = z.object({ projectId: z.string().min(1) });
export const getGoogleAdsConnection = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(projectSchema)
  .handler(async ({ context }) => {
    const available = !(await isHostedServerAuthMode());
    const [connection, currentUserHasGrant, googleOAuthConfigured] = available
      ? await Promise.all([
          service.getConnection(context),
          service.userHasGrant(context.userId),
          hasGoogleOAuthConfig(),
        ])
      : ([null, false, false] as const);
    return {
      available,
      connected: Boolean(connection),
      canManage:
        available &&
        hasOrgPermission(context.role, { integration: ["manage"] }),
      currentUserHasGrant,
      googleOAuthConfigured,
      connectedByEmail: connection?.connectedAccountEmail ?? null,
      property: connection?.customerName ?? null,
      propertyDetail: connection?.customerId ?? null,
      // New identity for every successful selection prevents results from a
      // previous account surviving a change, including a reconnect to that account.
      connectionKey: connection
        ? `${connection.id}:${connection.updatedAt}`
        : null,
    };
  });
export const listGoogleAdsAccounts = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(projectSchema)
  .handler(({ context }) => service.listAccounts(context));
export const setGoogleAdsAccount = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(
    projectSchema.extend({
      accountId: z.string().min(1),
      propertyId: z.string().regex(/^\d{10}:\d{10}$/),
    }),
  )
  .handler(async ({ data, context }) => {
    requireOrgPermission(context, { integration: ["manage"] });
    const saved = await service.save({
      ...context,
      accountId: data.accountId,
      propertyId: data.propertyId,
    });
    return {
      connected: true,
      connectedByEmail: saved.connectedAccountEmail,
      property: saved.customerName,
      propertyDetail: saved.customerId,
    };
  });
export const disconnectGoogleAds = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(projectSchema)
  .handler(async ({ context }) => {
    requireOrgPermission(context, { integration: ["manage"] });
    await service.disconnect(context);
    return { connected: false };
  });
export const startGoogleAdsLink = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(z.object({ callbackURL: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    await service.requireAvailable();
    return {
      url: await createGoogleAuthorizationUrl({
        integration: GOOGLE_ADS_INTEGRATION,
        userId: context.userId,
        callbackURL: data.callbackURL,
        publicOrigin: getPublicOrigin(getRequest()),
      }),
    };
  });
