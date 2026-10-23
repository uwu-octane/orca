// FORK: Google grant and connection operations resolve the installed plugin.
import { getGoogleOAuth } from "@/plugins/server/context";
import { createFileRoute } from "@tanstack/react-router";

import { GA4_INTEGRATION } from "@/plugins/google-oauth/contracts";

export const Route = createFileRoute("/api/ga4/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) =>
        (await getGoogleOAuth()).handleGoogleOAuthCallbackRequest(
          request,
          GA4_INTEGRATION,
        ),
    },
  },
});
