// FORK: Google grant and connection operations resolve the installed plugin.
import { getGoogleOAuth } from "@/plugins/server/context";
import { createFileRoute } from "@tanstack/react-router";

import { GOOGLE_ADS_INTEGRATION } from "@/plugins/google-oauth/contracts";

export const Route = createFileRoute("/api/google-ads/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) =>
        (await getGoogleOAuth()).handleGoogleOAuthCallbackRequest(
          request,
          GOOGLE_ADS_INTEGRATION,
        ),
    },
  },
});
