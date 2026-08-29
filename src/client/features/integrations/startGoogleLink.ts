import { toast } from "sonner";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
// FORK: locale plugin — module-level function, so callers pass the
// translator in (see DefaultCatchBoundary for the same pattern).
import type { T } from "@/plugins/locale";
import { authClient } from "@/lib/auth-client";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { startSelfHostedGa4Link } from "@/serverFunctions/ga4";
import { startSelfHostedGscLink } from "@/serverFunctions/gsc";
import { GA4_OAUTH_PROVIDER_ID } from "@/shared/ga4";
import { GSC_OAUTH_PROVIDER_ID } from "@/shared/gsc";

const googleProviders = {
  gsc: {
    providerId: GSC_OAUTH_PROVIDER_ID,
    startSelfHosted: startSelfHostedGscLink,
  },
  ga4: {
    providerId: GA4_OAUTH_PROVIDER_ID,
    startSelfHosted: startSelfHostedGa4Link,
  },
} as const;

/**
 * Kick off an incremental Google OAuth grant. On success this redirects the
 * whole page to Google's consent screen; `callbackURL` is where Google returns
 * the user afterward. Shared by the connection cards, onboarding, property
 * pickers, and re-engagement prompt so the link/error/redirect flow stays in
 * one place — callers keep their own analytics and dismissal behavior.
 */
export async function startGoogleLink(
  provider: "gsc" | "ga4",
  callbackURL: string,
  t?: T,
): Promise<void> {
  try {
    const config = googleProviders[provider];
    if (!isHostedClientAuthMode()) {
      const res = await config.startSelfHosted({ data: { callbackURL } });
      window.location.href = res.url;
      return;
    }

    const res = await authClient.oauth2.link({
      providerId: config.providerId,
      callbackURL,
    });
    if (res.error) {
      // The better-auth message is server-provided (open set); translate the
      // fallback only.
      const fallback = t
        ? t("Could not start Google sign-in")
        : "Could not start Google sign-in";
      toast.error(res.error.message ?? fallback);
      return;
    }
    if (res.data?.url) window.location.href = res.data.url;
  } catch (error) {
    toast.error(getStandardErrorMessage(error, undefined, t));
  }
}
