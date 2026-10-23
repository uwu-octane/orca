import { Context } from "cordis";
import {
  afterAll,
  beforeAll,
  beforeEach,
  afterEach,
  expect,
  it,
  vi,
} from "vitest";
import { bootPlugins } from "@/plugins/shared/plugin";
import GoogleOAuthService from "./index";
import * as googleAds from "@/plugins/google-ads";
import { createGoogleTestDatabase } from "./testDatabase";
const mocks = vi.hoisted(() => ({
  fetch: vi.fn<typeof fetch>(),
  auth: vi.fn(),
}));
vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("@/lib/auth", () => ({ getAuth: mocks.auth }));
vi.mock("@/server/lib/runtime-env", () => ({
  isHostedServerAuthMode: async () => false,
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
  await database.grant("google-ads");
  mocks.auth.mockReturnValue({
    $context: Promise.resolve({
      options: { account: { encryptOAuthTokens: false } },
    }),
  });
  mocks.fetch.mockImplementation(async (url) =>
    (url instanceof Request ? url.url : url.toString()).endsWith("userinfo")
      ? Response.json({ email: "owner@example.com" })
      : Response.json({ resourceNames: [] }),
  );
  vi.stubGlobal("fetch", mocks.fetch);
  ctx = new Context();
  await bootPlugins(
    ctx,
    [
      { id: "ads", name: "ads" },
      { id: "auth", name: "auth" },
    ],
    {
      ads: async () => googleAds,
      auth: async () => ({ default: GoogleOAuthService }),
    },
  );
});
afterEach(async () => {
  await ctx.fiber.dispose();
  vi.unstubAllGlobals();
});

it("assembles discovery even when Ads precedes OAuth without reading credentials at boot", async () => {
  expect(mocks.fetch).not.toHaveBeenCalled();
  expect(mocks.auth).not.toHaveBeenCalled();
  const result = await ctx.googleOAuth.ads.listAccounts({
    projectId: "p1",
    organizationId: "org1",
    userId: "u1",
  });
  expect(result.accounts[0]).toMatchObject({
    accountId: "google-a",
    email: "owner@example.com",
    unavailable: false,
  });
});

it("unregisters Ads discovery with its plugin while retaining the stored Google grant", async () => {
  await [...ctx.loader.entries()]
    .find((entry) => entry.id === "ads")!
    .fiber!.dispose();
  expect(ctx.get("googleAds")).toBeUndefined();
  const result = await ctx.googleOAuth.ads.listAccounts({
    projectId: "p1",
    organizationId: "org1",
    userId: "u1",
  });
  expect(result.accounts[0]).toMatchObject({
    unavailable: true,
    properties: [],
  });
  expect(mocks.fetch).not.toHaveBeenCalled();
  expect(
    (await database.client.execute("SELECT id FROM account")).rows,
  ).toHaveLength(1);
});

it("deactivates Ads when its authorization dependency is unloaded", async () => {
  await [...ctx.loader.entries()]
    .find((entry) => entry.id === "auth")!
    .fiber!.dispose();
  await ctx.loader.await();
  expect(ctx.get("googleOAuth")).toBeUndefined();
  expect(ctx.get("googleAds")).toBeUndefined();
  expect(
    (await database.client.execute("SELECT id FROM account")).rows,
  ).toHaveLength(1);
});
