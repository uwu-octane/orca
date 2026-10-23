import { Context } from "cordis";
import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  expect,
  it,
  vi,
} from "vitest";
import GoogleOAuthService from "../index";
import { createGoogleTestDatabase } from "../testDatabase";

const mocks = vi.hoisted(() => ({ fetch: vi.fn<typeof fetch>() }));
vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("@/lib/auth", () => ({
  getAuth: () => ({
    $context: Promise.resolve({
      options: { account: { encryptOAuthTokens: false } },
    }),
  }),
}));
let database: Awaited<ReturnType<typeof createGoogleTestDatabase>>;
let ctx: Context;
vi.mock("@/db", () => ({
  get db() {
    return database.db;
  },
}));
const input = {
  projectId: "p1",
  organizationId: "org1",
  accountId: "google-a",
  userId: "u1",
};
const site = { siteUrl: "https://example.com/", permissionLevel: "siteOwner" };
function googleResponse(url: RequestInfo | URL) {
  const path = url instanceof Request ? url.url : url.toString();
  if (path.endsWith("/sites")) return Response.json({ siteEntry: [site] });
  if (path.includes("accountSummaries"))
    return Response.json({
      accountSummaries: [
        {
          account: "accounts/1",
          displayName: "Agency",
          propertySummaries: [
            { property: "properties/11", displayName: "Site" },
          ],
        },
      ],
    });
  if (path.endsWith("/properties/11"))
    return Response.json({
      name: "properties/11",
      displayName: "Site",
      timeZone: "UTC",
      currencyCode: "USD",
    });
  if (path.endsWith("/userinfo"))
    return Response.json({ email: "owner@example.com" });
  throw new Error(`Unexpected Google URL: ${path}`);
}
beforeAll(async () => {
  database = await createGoogleTestDatabase();
});
afterAll(() => database?.close());
beforeEach(async () => {
  await database.reset();
  await database.grant("google-search-console");
  await database.grant("google-analytics");
  mocks.fetch.mockImplementation(async (url) => googleResponse(url));
  vi.stubGlobal("fetch", mocks.fetch);
  ctx = new Context();
  await ctx.plugin(GoogleOAuthService);
});
afterEach(async () => {
  await ctx.fiber.dispose();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("binds a verified Search Console property to the selected grant", async () => {
  await ctx.googleOAuth.gsc.setSite({ ...input, siteUrl: site.siteUrl });
  expect(await ctx.googleOAuth.gsc.getConnection("p1")).toMatchObject({
    siteUrl: site.siteUrl,
    connectedByUserId: "u1",
    gscAccountId: "google-a",
    connectedAccountEmail: "owner@example.com",
  });
});
it("persists freshly discovered Analytics property metadata", async () => {
  await ctx.googleOAuth.ga4.setProperty({
    ...input,
    propertyId: "properties/11",
  });
  expect(await ctx.googleOAuth.ga4.getConnection("p1")).toMatchObject({
    propertyId: "properties/11",
    propertyDisplayName: "Site",
    propertyTimeZone: "UTC",
    propertyCurrencyCode: "USD",
    connectedByUserId: "u1",
    ga4AccountId: "google-a",
  });
});
it.each(["gsc", "ga4"] as const)(
  "refuses another user's %s grant before calling Google",
  async (product) => {
    const call =
      product === "gsc"
        ? ctx.googleOAuth.gsc.setSite({
            ...input,
            userId: "u2",
            siteUrl: site.siteUrl,
          })
        : ctx.googleOAuth.ga4.setProperty({
            ...input,
            userId: "u2",
            propertyId: "properties/11",
          });
    await expect(call).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(await ctx.googleOAuth[product].getConnection("p1")).toBeNull();
  },
);
it.each(["missing", "unverified"] as const)(
  "refuses a %s Search Console property",
  async (kind) => {
    mocks.fetch.mockResolvedValue(
      Response.json({
        siteEntry:
          kind === "missing"
            ? []
            : [{ ...site, permissionLevel: "siteUnverifiedUser" }],
      }),
    );
    await expect(
      ctx.googleOAuth.gsc.setSite({ ...input, siteUrl: site.siteUrl }),
    ).rejects.toMatchObject({
      code: kind === "missing" ? "NOT_FOUND" : "FORBIDDEN",
    });
    expect(await ctx.googleOAuth.gsc.getConnection("p1")).toBeNull();
  },
);
it("refuses an Analytics property outside the selected account", async () => {
  await expect(
    ctx.googleOAuth.ga4.setProperty({ ...input, propertyId: "properties/999" }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect(await ctx.googleOAuth.ga4.getConnection("p1")).toBeNull();
});
it.each(["gsc", "ga4"] as const)(
  "retains a usable %s connection when userinfo is unavailable",
  async (product) => {
    mocks.fetch.mockImplementation(async (url) => {
      if (
        (url instanceof Request ? url.url : url.toString()).endsWith("userinfo")
      )
        throw new Error("userinfo unavailable");
      return googleResponse(url);
    });
    if (product === "gsc")
      await ctx.googleOAuth.gsc.setSite({ ...input, siteUrl: site.siteUrl });
    else
      await ctx.googleOAuth.ga4.setProperty({
        ...input,
        propertyId: "properties/11",
      });
    expect(await ctx.googleOAuth[product].getConnection("p1")).toMatchObject({
      connectedAccountEmail: null,
    });
  },
);
it.each([
  ["revoked", true, false, false],
  ["forbidden", true, false, false],
  ["disabled", false, true, true],
  ["rate-limit", false, true, false],
] as const)(
  "reports the correct Search Console connection state for %s",
  async (kind, reconnect, unavailable, apiDisabled) => {
    await database.grant("google-search-console", "google-b");
    await database.client.execute(
      "UPDATE account SET access_token = account_id",
    );
    if (kind === "revoked")
      await database.client.execute(
        "UPDATE account SET access_token_expires_at = NULL, refresh_token = NULL WHERE account_id='google-b'",
      );
    mocks.fetch.mockImplementation(async (url, options) => {
      if (
        new Headers(options?.headers).get("Authorization") === "Bearer google-b"
      )
        return new Response(
          kind === "disabled" ? "SERVICE_DISABLED" : "denied",
          { status: kind === "rate-limit" ? 429 : 403 },
        );
      return googleResponse(url);
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await ctx.googleOAuth.gsc.listSites(input);
    expect(
      result.accounts.find((row) => row.accountId === "google-a"),
    ).toMatchObject({
      requiresReconnect: false,
      propertiesUnavailable: false,
      sites: [site],
    });
    expect(
      result.accounts.find((row) => row.accountId === "google-b"),
    ).toMatchObject({
      requiresReconnect: reconnect,
      propertiesUnavailable: unavailable,
      apiDisabled,
      sites: [],
    });
  },
);
it.each([401, 403])(
  "distinguishes an expired Analytics grant from discovery failure (%s)",
  async (status) => {
    mocks.fetch.mockResolvedValue(new Response("", { status }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await ctx.googleOAuth.ga4.listProperties(input);
    expect(result.accounts[0]).toMatchObject({
      requiresReconnect: status === 401,
      propertiesUnavailable: status !== 401,
      properties: [],
    });
  },
);

it.each([false, true])(
  "selects a legacy Search Console binding only when its grant is unambiguous (multiple: %s)",
  async (multiple) => {
    await ctx.googleOAuth.gsc.setSite({ ...input, siteUrl: site.siteUrl });
    await database.client.execute(
      "UPDATE gsc_connections SET gsc_account_id = NULL",
    );
    if (multiple) await database.grant("google-search-console", "google-b");
    const result = await ctx.googleOAuth.gsc.listSites(input);
    const selected = result.accounts.flatMap((grant) =>
      grant.sites.filter((entry) => entry.isSelected),
    );
    expect(selected).toHaveLength(multiple ? 0 : 1);
  },
);

it("keeps the selected Analytics property scoped to its Google account", async () => {
  await ctx.googleOAuth.ga4.setProperty({
    ...input,
    propertyId: "properties/11",
  });
  await database.grant("google-analytics", "google-b");
  const result = await ctx.googleOAuth.ga4.listProperties(input);
  expect(
    result.accounts.map((grant) => [
      grant.accountId,
      grant.properties[0]?.isSelected,
    ]),
  ).toEqual([
    ["google-a", true],
    ["google-b", false],
  ]);
});
