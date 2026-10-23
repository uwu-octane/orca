import { Context } from "cordis";
import { symmetricEncrypt } from "better-auth/crypto";
import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  expect,
  it,
  vi,
} from "vitest";
import GoogleOAuthService from "./index";
import { createGoogleTestDatabase } from "./testDatabase";

const mocks = vi.hoisted(() => ({
  config: vi.fn(),
  fetch: vi.fn<typeof fetch>(),
  auth: vi.fn(),
}));
vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("@/lib/auth", () => ({ getAuth: mocks.auth }));
vi.mock("./oauth-config", () => ({
  getGoogleOAuthClientConfig: mocks.config,
  hasGoogleOAuthConfig: async () => true,
}));
let database: Awaited<ReturnType<typeof createGoogleTestDatabase>>;
let ctx: Context;
vi.mock("@/db", () => ({
  get db() {
    return database.db;
  },
}));
beforeAll(async () => {
  database = await createGoogleTestDatabase();
});
afterAll(() => database?.close());
beforeEach(async () => {
  await database.reset();
  mocks.config.mockResolvedValue({
    clientId: "client-id",
    clientSecret: "client-secret",
  });
  mocks.auth.mockReturnValue({
    $context: Promise.resolve({
      options: { account: { encryptOAuthTokens: false } },
      secretConfig: "secret",
    }),
  });
  vi.stubGlobal("fetch", mocks.fetch);
  ctx = new Context();
  await ctx.plugin(GoogleOAuthService);
});
afterEach(async () => {
  await ctx.fiber.dispose();
  vi.unstubAllGlobals();
});
const input = {
  userId: "u1",
  providerId: "google-search-console",
  accountId: "google-a",
};

it("returns the stored token while it is fresh without sending a Google request", async () => {
  await database.grant(input.providerId);
  expect(await ctx.googleOAuth.getGoogleAccessToken(input)).toBe("access");
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it("refreshes an expiring token and persists the rotated grant", async () => {
  await database.grant(
    input.providerId,
    input.accountId,
    input.userId,
    Date.now() + 1_000,
  );
  mocks.fetch.mockResolvedValue(
    Response.json({
      access_token: "new-access",
      refresh_token: "new-refresh",
      expires_in: 3600,
    }),
  );
  expect(await ctx.googleOAuth.getGoogleAccessToken(input)).toBe("new-access");
  const body = mocks.fetch.mock.calls[0][1]?.body;
  if (!(body instanceof URLSearchParams)) throw new Error("form body expected");
  expect(body.get("grant_type")).toBe("refresh_token");
  expect(body.get("refresh_token")).toBe("refresh");
  const row = (
    await database.client.execute(
      "SELECT access_token, refresh_token FROM account",
    )
  ).rows[0];
  expect(row).toMatchObject({
    access_token: "new-access",
    refresh_token: "new-refresh",
  });
});

it("rejects an expired grant that has no refresh token", async () => {
  await database.grant(
    input.providerId,
    input.accountId,
    input.userId,
    null,
    null,
  );
  await expect(ctx.googleOAuth.getGoogleAccessToken(input)).rejects.toThrow(
    /cannot be refreshed/,
  );
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it("keeps the stored grant unchanged when Google refuses refresh", async () => {
  await database.grant(input.providerId, input.accountId, input.userId, null);
  mocks.fetch.mockResolvedValue(new Response("", { status: 400 }));
  await expect(ctx.googleOAuth.getGoogleAccessToken(input)).rejects.toThrow(
    /refused to refresh/,
  );
  expect(
    (
      await database.client.execute(
        "SELECT access_token, refresh_token FROM account",
      )
    ).rows[0],
  ).toMatchObject({ access_token: "access", refresh_token: "refresh" });
});

it.each(["user", "provider", "account"] as const)(
  "cannot retrieve a different %s grant",
  async (other) => {
    await database.grant(input.providerId);
    await expect(
      ctx.googleOAuth.getGoogleAccessToken({
        ...input,
        ...(other === "user"
          ? { userId: "u2" }
          : other === "provider"
            ? { providerId: "google-analytics" }
            : { accountId: "other" }),
      }),
    ).rejects.toThrow(/No .* grant/);
    expect(mocks.fetch).not.toHaveBeenCalled();
  },
);

it("reads existing encrypted grants and encrypts refreshed credentials", async () => {
  const key = "test-secret-at-least-thirty-two-characters";
  mocks.auth.mockReturnValue({
    $context: Promise.resolve({
      options: { account: { encryptOAuthTokens: true } },
      secretConfig: key,
    }),
  });
  await database.grant(
    input.providerId,
    input.accountId,
    input.userId,
    null,
    await symmetricEncrypt({ key, data: "secret-refresh" }),
  );
  mocks.fetch.mockResolvedValue(
    Response.json({ access_token: "secret-access", expires_in: 3600 }),
  );
  expect(await ctx.googleOAuth.getGoogleAccessToken(input)).toBe(
    "secret-access",
  );
  expect(
    (await database.client.execute("SELECT access_token FROM account")).rows[0]
      .access_token,
  ).not.toBe("secret-access");
  expect(await ctx.googleOAuth.getGoogleAccessToken(input)).toBe(
    "secret-access",
  );
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
});
