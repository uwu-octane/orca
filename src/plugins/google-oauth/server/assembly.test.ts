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

it("rejects token access through a retained OAuth service after unload", async () => {
  const oauth = ctx.googleOAuth;
  const input = {
    userId: "u1",
    providerId: "google-ads",
    accountId: "google-a",
  };
  expect(await oauth.getGoogleAccessToken(input)).toBe("access");
  await ctx.loader.remove("auth");
  await expect(oauth.getGoogleAccessToken(input)).rejects.toThrow(/not active/);
});

it("aborts Ads discovery with its owning plugin", async () => {
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  const finishes: Array<() => void> = [];
  const signals: Array<AbortSignal | null | undefined> = [];
  mocks.fetch.mockImplementation(
    (_url, init) =>
      new Promise((resolve) => {
        signals.push(init?.signal);
        finishes.push(() =>
          resolve(
            Response.json({ resourceNames: [], email: "owner@example.com" }),
          ),
        );
        started();
      }),
  );
  const pending = ctx.googleOAuth.ads.listAccounts({
    projectId: "p1",
    organizationId: "org1",
    userId: "u1",
  });
  await ready;
  await ctx.loader.remove("ads");
  try {
    expect(signals).toHaveLength(2);
    expect(signals.every((signal) => signal?.aborted)).toBe(true);
  } finally {
    for (const finish of finishes) finish();
    await pending;
  }
});

it.each(["gsc", "ga4"] as const)(
  "aborts %s property discovery when OAuth unloads",
  async (integration) => {
    await database.grant(
      integration === "gsc" ? "google-search-console" : "google-analytics",
    );
    let started!: () => void;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    let finish!: () => void;
    let signal: AbortSignal | null | undefined;
    let held = false;
    mocks.fetch.mockImplementation((_url, init) => {
      if (held)
        return Promise.resolve(Response.json({ email: "owner@example.com" }));
      held = true;
      return new Promise((resolve) => {
        signal = init?.signal;
        finish = () =>
          resolve(Response.json({ siteEntry: [], accountSummaries: [] }));
        started();
      });
    });
    const input = { userId: "u1", projectId: "p1" };
    const pending =
      integration === "gsc"
        ? ctx.googleOAuth.gsc.listSites(input)
        : ctx.googleOAuth.ga4.listProperties(input);
    await ready;
    await ctx.loader.remove("auth");
    try {
      expect(signal?.aborted).toBe(true);
    } finally {
      finish();
      await pending;
    }
  },
);

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
