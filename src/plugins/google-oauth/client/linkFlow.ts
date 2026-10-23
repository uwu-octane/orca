import type { Context } from "cordis";
import { toast } from "sonner";
import { startGoogleAdsLink } from "@/serverFunctions/googleAds";
import { startGa4Link } from "@/serverFunctions/ga4";
import { startGscLink } from "@/serverFunctions/gsc";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import type { GoogleLinkProvider } from "@/shared/google-link";

const startLink: Record<GoogleLinkProvider, typeof startGscLink> = {
  gsc: startGscLink,
  ga4: startGa4Link,
  google_ads: startGoogleAdsLink,
};

export interface GoogleLinkFlow {
  readonly pending: boolean;
  subscribe(listener: () => void): () => void;
  start(provider: GoogleLinkProvider, callbackURL: string): Promise<boolean>;
}

/** One consent redirect per client plugin; unloading releases pending work. */
export function createLinkFlow(ctx: Context): GoogleLinkFlow {
  let pending = false;
  let active = true;
  let releaseTimer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const setPending = (value: boolean) => {
    pending = value;
    for (const listener of listeners) listener();
  };
  ctx.effect(() => () => {
    active = false;
    clearTimeout(releaseTimer);
    setPending(false);
    listeners.clear();
  });
  return {
    get pending() {
      return pending;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async start(provider, callbackURL) {
      if (!active) throw new Error("Google connection plugin is not active");
      if (pending) return false;
      setPending(true);
      let redirecting = false;
      try {
        const { url } = await startLink[provider]({ data: { callbackURL } });
        // A consent request can finish after its plugin was unloaded.
        if (!active) return false;
        window.location.href = url;
        redirecting = true;
        // Preserve the existing recovery if the browser navigation is cancelled.
        releaseTimer = setTimeout(() => setPending(false), 15_000);
        return true;
      } catch (error) {
        if (active)
          toast.error(getStandardErrorMessage(error, undefined, ctx.locale.t));
        return false;
      } finally {
        if (!redirecting) setPending(false);
      }
    },
  };
}
