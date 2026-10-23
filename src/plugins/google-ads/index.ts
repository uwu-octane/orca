import type { GoogleAdsService } from "./contracts";
import type { Context } from "cordis";
import { discoverGoogleAdsCustomers, googleAdsAccountEmail } from "./client";
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
  ctx.googleOAuth.registerAdsDiscovery({
    discoverCustomers: discoverGoogleAdsCustomers,
    accountEmail: googleAdsAccountEmail,
  });
  ctx.provide("googleAds", {
    ...createTargeting((scope) => ctx.googleOAuth.ads.credentials(scope)),
    keywordIdeas: fetchGoogleKeywordIdeas,
  });
}
