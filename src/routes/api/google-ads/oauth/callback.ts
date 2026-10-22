import { createFileRoute } from "@tanstack/react-router";
import {
  GOOGLE_ADS_INTEGRATION,
  handleGoogleOAuthCallbackRequest,
} from "@/server/features/google/googleOAuth";

export const Route = createFileRoute("/api/google-ads/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) =>
        handleGoogleOAuthCallbackRequest(request, GOOGLE_ADS_INTEGRATION),
    },
  },
});
