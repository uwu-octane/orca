import type { GoogleAdsService } from "./contracts";
import type { Context } from "cordis";
import { createGoogleAdsClient } from "./client";
import { fetchGoogleKeywordIdeas } from "./keywordIdeas";
import { createTargeting } from "./targeting";

export const name = "google-ads";
export const inject = ["googleOAuth"];

declare module "cordis" {
  interface Context {
    googleAds: GoogleAdsService;
  }
}

export function apply(ctx: Context) {
  const lifetime = new AbortController();
  ctx.effect(
    () => () => lifetime.abort(new Error("Google Ads plugin is not active")),
  );
  const client = createGoogleAdsClient(lifetime.signal);
  ctx.googleOAuth.registerAdsDiscovery({
    discoverCustomers: client.discoverCustomers,
    accountEmail: client.accountEmail,
  });
  ctx.provide("googleAds", {
    ...createTargeting(
      (scope) => ctx.googleOAuth.ads.credentials(scope),
      client.request,
    ),
    keywordIdeas: (input, credentials) =>
      fetchGoogleKeywordIdeas(input, credentials, client.request),
  });
}
