export const GOOGLE_ADS_OAUTH_PROVIDER_ID = "google-ads";
export const GOOGLE_ADS_DATA_SCOPE = "https://www.googleapis.com/auth/adwords";
export const GOOGLE_ADS_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  GOOGLE_ADS_DATA_SCOPE,
] as const;
