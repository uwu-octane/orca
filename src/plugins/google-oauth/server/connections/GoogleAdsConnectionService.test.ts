import { Context } from "cordis";
import {
  afterAll,
  beforeAll,
  afterEach,
  beforeEach,
  expect,
  it,
  vi,
} from "vitest";
import GoogleOAuthService from "../index";
import * as googleAds from "@/plugins/google-ads";
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
vi.mock("@/server/lib/runtime-env", () => ({
  isHostedServerAuthMode: async () => false,
}));
let database: Awaited<ReturnType<typeof createGoogleTestDatabase>>;
let ctx: Context;
let service: GoogleOAuthService["ads"];
vi.mock("@/db", () => ({
  get db() {
    return database.db;
  },
}));
beforeAll(async () => {
  database = await createGoogleTestDatabase();
});
afterAll(() => database?.close());
const input = {
  projectId: "p1",
  organizationId: "org1",
  userId: "u1",
  accountId: "google1",
  propertyId: "1111111111:2222222222",
};
function customer(id: string, manager = false) {
  return {
    customerClient: {
      id,
      manager,
      status: "ENABLED",
      descriptiveName: `Ads ${id}`,
    },
  };
}
function urlString(url: RequestInfo | URL) {
  return typeof url === "string"
    ? url
    : url instanceof URL
      ? url.href
      : url.url;
}
beforeEach(async () => {
  await database.reset();
  await database.grant("google-ads", "google1");
  ctx = new Context();
  await ctx.plugin(GoogleOAuthService);
  await ctx.plugin(googleAds);
  service = ctx.googleOAuth.ads;
  mocks.fetch.mockImplementation(async (url) => {
    if (urlString(url).endsWith("userinfo"))
      return Response.json({ email: "owner@example.com" });
    if (urlString(url).endsWith(":listAccessibleCustomers"))
      return Response.json({ resourceNames: ["customers/1111111111"] });
    return Response.json({ results: [customer("2222222222")] });
  });
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(async () => {
  await ctx.fiber.dispose();
  vi.unstubAllGlobals();
});

it("discovers manager clients across pages, preserving the explicit access route", async () => {
  mocks.fetch.mockImplementation(async (url, options) => {
    if (urlString(url).endsWith("userinfo"))
      return Response.json({ email: "owner@example.com" });
    if (urlString(url).endsWith(":listAccessibleCustomers"))
      return Response.json({ resourceNames: ["customers/1111111111"] });
    const body = typeof options?.body === "string" ? options.body : "";
    expect(options?.headers).toMatchObject({
      "login-customer-id": "1111111111",
    });
    return body.includes('"pageToken":"page2"')
      ? Response.json({ results: [customer("3333333333")] })
      : Response.json({
          results: [customer("2222222222"), customer("1111111111", true)],
          nextPageToken: "page2",
        });
  });
  const result = await service.listAccounts(input);
  expect(result.accounts[0]).toMatchObject({
    email: "owner@example.com",
    unavailable: false,
    requiresReconnect: false,
  });
  expect(result.accounts[0].properties.map((item) => item.id)).toEqual([
    "1111111111:2222222222",
    "1111111111:3333333333",
  ]);
});

it("saves only a freshly discovered customer under the selected grant", async () => {
  const result = await service.save(input);
  expect(result).toMatchObject({
    projectId: "p1",
    organizationId: "org1",
    customerId: "2222222222",
    loginCustomerId: "1111111111",
    googleAccountId: "google1",
    connectedByUserId: "u1",
    connectedAccountEmail: "owner@example.com",
  });
});

it("rejects another user's grant before any Google request or persistence", async () => {
  await database.client.execute("UPDATE account SET user_id = 'u2'");
  await expect(service.save(input)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  expect(mocks.fetch).not.toHaveBeenCalled();
  expect(await service.getConnection(input)).toBeNull();
});

it("rejects a forged manager route even when the customer ID matches", async () => {
  await expect(
    service.save({ ...input, propertyId: "9999999999:2222222222" }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect(await service.getConnection(input)).toBeNull();
});

it.each([401, 403, 429])(
  "shows failed account discovery as an error state, not an empty account (%s)",
  async (status) => {
    mocks.fetch.mockResolvedValue(Response.json({}, { status }));
    const { accounts } = await service.listAccounts(input);
    expect(accounts[0]).toMatchObject({
      requiresReconnect: status === 401,
      unavailable: status !== 401,
      properties: [],
    });
  },
);
