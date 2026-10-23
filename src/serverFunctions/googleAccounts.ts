// FORK: Google grant and connection operations resolve the installed plugin.
import { getGoogleOAuth } from "@/plugins/server/context";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireAuthenticatedContext } from "@/serverFunctions/middleware";

const accountSchema = z.object({
  provider: z.enum(["gsc", "ga4", "google_ads"]),
  accountId: z.string().min(1),
});

export const getGoogleAccountRemovalImpact = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(accountSchema)
  .handler(async ({ data, context }) =>
    (await getGoogleOAuth()).getRemovalImpact({
      ...data,
      userId: context.userId,
    }),
  );

export const removeGoogleAccount = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(accountSchema.extend({ confirmed: z.literal(true) }))
  .handler(async ({ data, context }) =>
    (await getGoogleOAuth()).removeAccount({ ...data, userId: context.userId }),
  );
