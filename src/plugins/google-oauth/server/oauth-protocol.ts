import { symmetricDecrypt, symmetricEncrypt } from "better-auth/crypto";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import type { GoogleOAuthIntegration } from "../contracts";
import { GoogleAccountRepository } from "./GoogleAccountRepository";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

const googleTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().optional(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
  id_token: z.string().optional(),
});

export type GoogleTokenResponse = z.infer<typeof googleTokenResponseSchema>;

/** Same-origin path to return to after consent. A pathname can start with
 *  `//host`, which browsers treat as protocol-relative, so the reduced path is
 *  re-parsed to prove it still resolves to our origin. */
export function getSafeCallbackPath(callbackURL: string, publicOrigin: string) {
  try {
    const url = new URL(callbackURL, publicOrigin);
    const path = `${url.pathname}${url.search}${url.hash}`;
    if (url.origin !== publicOrigin) return "/";
    if (new URL(path, publicOrigin).origin !== publicOrigin) return "/";
    return path;
  } catch {
    return "/";
  }
}

export function getRedirectUri(
  publicOrigin: string,
  integration: GoogleOAuthIntegration,
) {
  return `${publicOrigin}${integration.callbackPath}`;
}

/** Token encryption matches Better Auth's own `account` rows so grants
 *  written before this module (and google social-login rows) stay readable. */
export async function tokenCrypto() {
  const ctx = await getAuth().$context;
  const enabled = Boolean(ctx.options.account?.encryptOAuthTokens);
  return {
    encrypt: (value: string) =>
      enabled
        ? symmetricEncrypt({ key: ctx.secretConfig, data: value })
        : value,
    decrypt: (value: string) =>
      enabled
        ? symmetricDecrypt({ key: ctx.secretConfig, data: value })
        : value,
  };
}

export async function upsertGrant(
  input: {
    integration: GoogleOAuthIntegration;
    userId: string;
    googleAccountId: string;
    tokens: GoogleTokenResponse;
  },
  signal: AbortSignal,
) {
  const { encrypt } = await tokenCrypto();
  const accountValues = {
    accountId: input.googleAccountId,
    providerId: input.integration.providerId,
    userId: input.userId,
    accessToken: await encrypt(input.tokens.access_token),
    refreshToken: input.tokens.refresh_token
      ? await encrypt(input.tokens.refresh_token)
      : null,
    accessTokenExpiresAt: new Date(
      Date.now() + (input.tokens.expires_in ?? 3600) * 1_000,
    ),
    refreshTokenExpiresAt: null,
    scope: input.tokens.scope
      ? input.tokens.scope.trim().split(/\s+/).join(",")
      : input.integration.scopes.join(","),
    password: null,
  };
  signal.throwIfAborted();
  await GoogleAccountRepository.upsertGrant(accountValues);
}

/** Google's token endpoint; null when it rejects the grant. */
export async function fetchTokens(
  params: Record<string, string>,
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
    signal,
  });
  signal.throwIfAborted();
  if (!response.ok) return null;
  return googleTokenResponseSchema.parse(await response.json());
}
