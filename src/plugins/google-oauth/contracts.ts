import {
  GOOGLE_ADS_OAUTH_PROVIDER_ID,
  GOOGLE_ADS_DATA_SCOPE,
  GOOGLE_ADS_OAUTH_SCOPES,
} from "@/shared/google-ads";
import {
  GA4_DATA_SCOPE,
  GA4_OAUTH_PROVIDER_ID,
  GA4_OAUTH_SCOPES,
} from "@/shared/ga4";
import {
  GSC_DATA_SCOPE,
  GSC_OAUTH_PROVIDER_ID,
  GSC_OAUTH_SCOPES,
} from "@/shared/gsc";
import type { GoogleLinkProvider } from "@/shared/google-link";
export type GoogleOAuthIntegration = {
  provider: GoogleLinkProvider;
  providerId: string;
  displayName: string;
  callbackPath: `/${string}`;
  scopes: readonly string[];
  /** The data permission the integration can't work without. */
  requiredScope: string;
};

export const GSC_INTEGRATION: GoogleOAuthIntegration = {
  provider: "gsc",
  providerId: GSC_OAUTH_PROVIDER_ID,
  displayName: "Search Console",
  callbackPath: "/api/gsc/oauth/callback",
  scopes: GSC_OAUTH_SCOPES,
  requiredScope: GSC_DATA_SCOPE,
};

export const GA4_INTEGRATION: GoogleOAuthIntegration = {
  provider: "ga4",
  providerId: GA4_OAUTH_PROVIDER_ID,
  displayName: "Google Analytics",
  callbackPath: "/api/ga4/oauth/callback",
  scopes: GA4_OAUTH_SCOPES,
  requiredScope: GA4_DATA_SCOPE,
};

export const GOOGLE_ADS_INTEGRATION: GoogleOAuthIntegration = {
  provider: "google_ads",
  providerId: GOOGLE_ADS_OAUTH_PROVIDER_ID,
  displayName: "Google Ads",
  callbackPath: "/api/google-ads/oauth/callback",
  scopes: GOOGLE_ADS_OAUTH_SCOPES,
  requiredScope: GOOGLE_ADS_DATA_SCOPE,
};

/** Server-only credential resolution; never returned by a browser endpoint. */
export type GoogleAccessToken = (input: {
  userId: string;
  providerId: string;
  accountId?: string;
}) => Promise<string>;

export interface GoogleAdsDiscovery {
  discoverCustomers(accessToken: string): Promise<
    Array<{
      id: string;
      customerId: string;
      loginCustomerId: string;
      name: string;
    }>
  >;
  accountEmail(accessToken: string): Promise<string>;
}

export type GoogleAccountInput = {
  userId: string;
  provider: GoogleLinkProvider;
  accountId: string;
};

import type { gscConnections, ga4Connections } from "@/db/schema";
export type GscConnection = typeof gscConnections.$inferSelect;
export type Ga4Connection = typeof ga4Connections.$inferSelect;

/** Resolved server credentials, never part of a public response. */
export type GoogleAdsCredentials = {
  customerId: string;
  loginCustomerId: string;
  accessToken: string;
};
