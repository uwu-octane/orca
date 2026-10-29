import { createAccountManagement } from "./accounts";
import {
  getSafeCallbackPath,
  getRedirectUri,
  tokenCrypto,
  upsertGrant,
  fetchTokens,
  type GoogleTokenResponse,
} from "./oauth-protocol";
import {
  getGoogleAccessMode,
  isGatewayGoogleAvailable,
  ownGoogleCallbackDisabled,
} from "./googleAccess";
import {
  getGatewayGoogleFetch,
  getGatewayGoogleConnectUrl,
} from "./gatewayGoogle";
import { purgeUnusedGoogleData } from "./googleDataRetention";
import { Service, type Context } from "cordis";
import { GoogleAccountRepository } from "./GoogleAccountRepository";
import { createGscConnections } from "./connections/GscConnectionService";
import { createGa4Connections } from "./connections/Ga4ConnectionService";
import { createGoogleAdsConnections } from "./connections/GoogleAdsConnectionService";
import type { GoogleOAuthIntegration, GoogleAdsDiscovery } from "../contracts";
import { resolveUserContextFromHeaders } from "@/middleware/ensure-user/resolve";
import { AppError } from "@/server/lib/errors";
import { responseForAppError } from "@/server/lib/http-errors";
import { getPublicOrigin } from "@/server/mcp/public-origin";
import { GOOGLE_LINK_ERROR_PARAM } from "@/shared/google-link";
import {
  getGoogleOAuthClientConfig,
  hasGoogleOAuthConfig,
} from "./oauth-config";
import { getGoogleAccountId } from "./googleIdToken";
import {
  consumeState,
  createState,
  getCodeChallenge,
  getCodeVerifier,
} from "./googleOAuthState";

/**
 * Google data grants (Search Console, Analytics) are linked here rather than
 * through Better Auth's generic-oauth plugin. Better Auth treats every linked
 * provider account as a login identity and refuses to link one Google account
 * to a second user, which blocked agencies and multi-member orgs from each
 * connecting the same client Google account. Grants live in the Better Auth
 * `account` table, encrypted with its secret, but are keyed per user so the
 * same Google identity may back several users. This module owns the whole
 * lifecycle: consent redirect, callback, and access-token refresh. The state
 * is a single-use nonce bound to the session user and provider, stored in
 * Better Auth's verification table and deleted by the first callback that
 * presents it. The PKCE verifier is an HMAC of that nonce.
 */

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
// Refresh when the stored access token is within this many ms of expiry.
const ACCESS_TOKEN_SKEW_MS = 5_000;

function redirect(location: string) {
  return new Response(null, { status: 303, headers: { Location: location } });
}

declare module "cordis" {
  interface Context {
    googleOAuth: GoogleOAuthService;
  }
}

/** Google data authorization and project connections, scoped on each operation. */
export default class GoogleOAuthService extends Service {
  private readonly lifetime = new AbortController();
  readonly gsc = createGscConnections(
    (input) => this.getGoogleAccessToken(input),
    this.lifetime.signal,
    () => this.getGatewayGoogleFetch(),
  );
  readonly ga4 = createGa4Connections(
    (input) => this.getGoogleAccessToken(input),
    this.lifetime.signal,
    () => this.getGatewayGoogleFetch(),
  );
  readonly ads = createGoogleAdsConnections(
    (input) => this.getGoogleAccessToken(input),
    () => {
      if (!this.adsDiscovery) throw new AppError("GOOGLE_ADS_NOT_CONFIGURED");
      return this.adsDiscovery;
    },
    this.lifetime.signal,
  );
  private adsDiscovery?: GoogleAdsDiscovery;
  registerAdsDiscovery(discovery: GoogleAdsDiscovery) {
    this.lifetime.signal.throwIfAborted();
    if (this.adsDiscovery)
      throw new Error("Google Ads discovery is already registered");
    return this.ctx.effect(() => {
      this.adsDiscovery = discovery;
      return () => {
        this.adsDiscovery = undefined;
      };
    });
  }
  readonly hasGoogleOAuthConfig = hasGoogleOAuthConfig;
  constructor(ctx: Context) {
    super(ctx, "googleOAuth");
    ctx.effect(
      () => () =>
        this.lifetime.abort(new Error("Google OAuth plugin is not active")),
    );
  }

  async getGoogleAccessMode() {
    this.lifetime.signal.throwIfAborted();
    return getGoogleAccessMode();
  }
  async isGatewayGoogleAvailable() {
    this.lifetime.signal.throwIfAborted();
    return isGatewayGoogleAvailable();
  }
  async getGatewayGoogleFetch(): Promise<typeof fetch | null> {
    this.lifetime.signal.throwIfAborted();
    if ((await getGoogleAccessMode()) !== "gateway") return null;
    const send = await getGatewayGoogleFetch();
    this.lifetime.signal.throwIfAborted();
    if (!send)
      throw new AppError(
        "AUTH_CONFIG_MISSING",
        "Google is not available through the gateway.",
      );
    return (input, init) => {
      this.lifetime.signal.throwIfAborted();
      const signal = AbortSignal.any([
        this.lifetime.signal,
        ...(init?.signal ? [init.signal] : []),
      ]);
      return send(input, { ...init, signal });
    };
  }
  async purgeUnusedGoogleData(now = new Date()) {
    this.lifetime.signal.throwIfAborted();
    return purgeUnusedGoogleData(this, now);
  }
  async revokeGoogleToken(token: string) {
    this.lifetime.signal.throwIfAborted();
    const response = await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
      signal: AbortSignal.any([
        this.lifetime.signal,
        AbortSignal.timeout(10_000),
      ]),
    });
    if (!response.ok && response.status !== 400)
      throw new Error(`Google token revocation failed: ${response.status}`);
  }

  private readonly accountManagement = createAccountManagement(
    (input) => this.getGoogleAccessToken(input),
    (token) => this.revokeGoogleToken(token),
    this.lifetime.signal,
  );
  readonly getRemovalImpact = this.accountManagement.getRemovalImpact;
  readonly removeAccount = this.accountManagement.removeAccount;
  readonly purgeUnusedGrants = this.accountManagement.purgeUnusedGrants;

  async createGoogleAuthorizationUrl(input: {
    integration: GoogleOAuthIntegration;
    userId: string;
    callbackURL: string;
    publicOrigin: string;
  }) {
    this.lifetime.signal.throwIfAborted();
    if (
      input.integration.provider !== "google_ads" &&
      (await getGoogleAccessMode()) === "gateway"
    ) {
      return getGatewayGoogleConnectUrl(
        new URL(
          getSafeCallbackPath(input.callbackURL, input.publicOrigin),
          input.publicOrigin,
        ).toString(),
      );
    }
    const config = await getGoogleOAuthClientConfig();
    if (!config || !(await hasGoogleOAuthConfig(config))) {
      throw new AppError(
        "AUTH_CONFIG_MISSING",
        `${input.integration.displayName} is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and BETTER_AUTH_SECRET.`,
      );
    }
    this.lifetime.signal.throwIfAborted();
    const state = await createState({
      provider: input.integration.provider,
      userId: input.userId,
      callbackPath: getSafeCallbackPath(input.callbackURL, input.publicOrigin),
    });
    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set(
      "redirect_uri",
      getRedirectUri(input.publicOrigin, input.integration),
    );
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", input.integration.scopes.join(" "));
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "select_account consent");
    url.searchParams.set("state", state);
    url.searchParams.set(
      "code_challenge",
      await getCodeChallenge(
        await getCodeVerifier({
          state,
          clientSecret: config.clientSecret,
          provider: input.integration.provider,
        }),
      ),
    );
    url.searchParams.set("code_challenge_method", "S256");
    return url.toString();
  }

  /**
   * Google returns here after consent. Failures the user can act on go back to
   * the page that started the connect with `error` + the provider marker, which
   * GoogleLinkErrorAlert renders next to the Connect button. An unverifiable
   * state has no page to return to, so it lands on /auth-error.
   */
  private async handleGoogleOAuthCallback(input: {
    integration: GoogleOAuthIntegration;
    request: Request;
    userId: string;
    publicOrigin: string;
  }) {
    this.lifetime.signal.throwIfAborted();
    const config = await getGoogleOAuthClientConfig();
    if (!config) {
      throw new AppError(
        "AUTH_CONFIG_MISSING",
        `${input.integration.displayName} OAuth is not configured.`,
      );
    }
    const url = new URL(input.request.url);
    const rawState = url.searchParams.get("state");
    // Consumed before the user check so a state presented by the wrong session
    // is burned rather than left for a second attempt.
    const state = await consumeState({
      state: rawState,
      provider: input.integration.provider,
    });
    if (!rawState || !state || state.userId !== input.userId) {
      return redirect("/auth-error?error=state_mismatch");
    }
    const fail = (code: string) => {
      const back = new URL(state.callbackPath, input.publicOrigin);
      back.searchParams.set(
        GOOGLE_LINK_ERROR_PARAM,
        input.integration.provider,
      );
      back.searchParams.set("error", code);
      return redirect(`${back.pathname}${back.search}${back.hash}`);
    };
    const googleError = url.searchParams.get("error");
    if (googleError) return fail(googleError);
    const code = url.searchParams.get("code");
    if (!code) return fail("missing_code");
    let tokens: GoogleTokenResponse | null;
    try {
      tokens = await fetchTokens(
        {
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: getRedirectUri(input.publicOrigin, input.integration),
          grant_type: "authorization_code",
          code_verifier: await getCodeVerifier({
            state: rawState,
            clientSecret: config.clientSecret,
            provider: input.integration.provider,
          }),
        },
        this.lifetime.signal,
      );
    } catch {
      return fail("oauth_code_verification_failed");
    }
    if (!tokens) return fail("oauth_code_verification_failed");
    // Google's consent screen lets the user approve sign-in while leaving the
    // Search Console or Analytics box unchecked. That grant gets a 403 on every
    // API call, so send them back to check it rather than saving it. An omitted
    // scope means everything requested was granted.
    if (
      tokens.scope &&
      !tokens.scope.split(/\s+/).includes(input.integration.requiredScope)
    ) {
      return fail("scope_not_granted");
    }
    let googleAccountId: string;
    try {
      googleAccountId = await getGoogleAccountId(
        tokens.id_token ?? "",
        config.clientId,
      );
    } catch {
      return fail("oauth_code_verification_failed");
    }
    try {
      await upsertGrant(
        {
          integration: input.integration,
          userId: input.userId,
          googleAccountId,
          tokens,
        },
        this.lifetime.signal,
      );
    } catch (error) {
      console.error("google.oauth.grant_save_failed", {
        provider: input.integration.provider,
        error,
      });
      return fail("connection_save_failed");
    }
    return redirect(state.callbackPath);
  }

  /**
   * A currently valid access token for one of the user's Google grants,
   * refreshed against Google and re-persisted when it is about to expire.
   * `accountId` (the Google sub) picks between several grants for the same
   * provider; legacy connections without one fall back to the first grant.
   */
  async getGoogleAccessToken(input: {
    userId: string;
    providerId: string;
    accountId?: string;
  }): Promise<string> {
    this.lifetime.signal.throwIfAborted();
    const grant = await GoogleAccountRepository.findGrant(input);
    if (!grant) throw new Error(`No ${input.providerId} grant for this user.`);
    const { encrypt, decrypt } = await tokenCrypto();
    const expiresAt = grant.accessTokenExpiresAt?.getTime();
    const fresh =
      expiresAt !== undefined && expiresAt - Date.now() > ACCESS_TOKEN_SKEW_MS;
    if (fresh && grant.accessToken) {
      const token = await decrypt(grant.accessToken);
      this.lifetime.signal.throwIfAborted();
      return token;
    }
    if (!grant.refreshToken) {
      // Google only issues a refresh token on the first consent, so a grant
      // without one cannot recover once its access token expires. Failing here
      // lets the GSC/GA4 clients ask for a reconnect instead of sending a dead
      // token to Google.
      throw new Error(
        `The ${input.providerId} grant has expired and cannot be refreshed.`,
      );
    }
    this.lifetime.signal.throwIfAborted();
    const config = await getGoogleOAuthClientConfig();
    if (!config) {
      throw new AppError(
        "AUTH_CONFIG_MISSING",
        "Google OAuth is not configured.",
      );
    }
    const tokens = await fetchTokens(
      {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: await decrypt(grant.refreshToken),
        grant_type: "refresh_token",
      },
      this.lifetime.signal,
    );
    if (!tokens) {
      throw new Error(
        `Google refused to refresh the ${input.providerId} grant.`,
      );
    }
    const values = {
      accessToken: await encrypt(tokens.access_token),
      accessTokenExpiresAt: new Date(
        Date.now() + (tokens.expires_in ?? 3600) * 1_000,
      ),
      // Keep the original refresh token unless Google rotates it.
      ...(tokens.refresh_token
        ? { refreshToken: await encrypt(tokens.refresh_token) }
        : {}),
      updatedAt: new Date(),
    };
    this.lifetime.signal.throwIfAborted();
    await GoogleAccountRepository.updateTokens(grant.id, values);
    return tokens.access_token;
  }

  async handleGoogleOAuthCallbackRequest(
    request: Request,
    integration: GoogleOAuthIntegration,
  ) {
    this.lifetime.signal.throwIfAborted();
    if (
      integration.provider !== "google_ads" &&
      (await ownGoogleCallbackDisabled())
    )
      return new Response("Not found", { status: 404 });
    try {
      this.lifetime.signal.throwIfAborted();
      const context = await resolveUserContextFromHeaders(request.headers);
      return await this.handleGoogleOAuthCallback({
        integration,
        request,
        userId: context.userId,
        publicOrigin: getPublicOrigin(request),
      });
    } catch (error) {
      // The browser is mid-redirect from Google, so an expired session or a
      // missing config should land on the error page, not a bare status body.
      if (error instanceof AppError) {
        return redirect(`/auth-error?error=${error.code.toLowerCase()}`);
      }
      return responseForAppError(
        error,
        `${integration.displayName} OAuth failed`,
      );
    }
  }
}
