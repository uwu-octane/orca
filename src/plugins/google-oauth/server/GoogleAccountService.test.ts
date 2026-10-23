import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Context } from "cordis";
import GoogleOAuthService from "./index";
import { createGoogleTestDatabase } from "./testDatabase";
import { Ga4ConnectionRepository } from "./connections/Ga4ConnectionRepository";
import { GscConnectionRepository } from "./connections/GscConnectionRepository";

vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("@/lib/auth", () => ({ getAuth: vi.fn() }));
let database: Awaited<ReturnType<typeof createGoogleTestDatabase>>;
let ctx: Context;
let service: GoogleOAuthService;
vi.mock("@/db", () => ({
  get db() {
    return database.db;
  },
}));
vi.mock("@/db/runBatch", () => ({
  runBatch: (...args: Parameters<typeof database.runBatch>) =>
    database.runBatch(...args),
}));
beforeAll(async () => {
  database = await createGoogleTestDatabase();
});
afterAll(() => database?.close());
beforeEach(async () => {
  await database.client.execute("DROP TRIGGER IF EXISTS fail_remove");
  await database.reset();
  ctx = new Context();
  await ctx.plugin(GoogleOAuthService);
  service = ctx.googleOAuth;
});
afterEach(async () => {
  await ctx.fiber.dispose();
});

async function grant(provider: string, accountId = "google-a", userId = "u1") {
  await database.grant(provider, accountId, userId);
}
async function mapping(
  provider: "gsc" | "ga4" | "google_ads",
  projectId: string,
  accountId: string | null = "google-a",
  userId = "u1",
) {
  if (provider === "google_ads")
    await database.client.execute({
      sql: "INSERT INTO google_ads_connections (id, project_id, organization_id, customer_id, login_customer_id, customer_name, connected_by_user_id, google_account_id) VALUES (?, ?, ?, '1234567890', '1234567890', 'Ads', ?, ?)",
      args: [
        projectId,
        projectId,
        projectId === "p2" ? "org2" : "org1",
        userId,
        accountId,
      ],
    });
  else if (provider === "gsc")
    await database.client.execute({
      sql: "INSERT INTO gsc_connections (id, project_id, organization_id, site_url, connected_by_user_id, gsc_account_id) VALUES (?, ?, ?, 'https://example.com/', ?, ?)",
      args: [
        projectId,
        projectId,
        projectId === "p2" ? "org2" : "org1",
        userId,
        accountId,
      ],
    });
  else
    await database.client.execute({
      sql: "INSERT INTO ga4_connections (id, project_id, organization_id, property_id, property_display_name, property_time_zone, property_currency_code, connected_by_user_id, ga4_account_id) VALUES (?, ?, ?, 'properties/123', 'Example', 'UTC', 'USD', ?, ?)",
      args: [
        projectId,
        projectId,
        projectId === "p2" ? "org2" : "org1",
        userId,
        accountId,
      ],
    });
}
async function rows(
  table:
    | "account"
    | "gsc_connections"
    | "ga4_connections"
    | "google_ads_connections",
) {
  return (await database.client.execute(`SELECT * FROM ${table} ORDER BY id`))
    .rows;
}

for (const provider of ["gsc", "ga4", "google_ads"] as const) {
  describe(`${provider} Google account removal`, () => {
    const providerId =
      provider === "google_ads"
        ? "google-ads"
        : provider === "gsc"
          ? "google-search-console"
          : "google-analytics";
    const otherId =
      provider === "gsc" ? "google-analytics" : "google-search-console";
    const table =
      provider === "google_ads"
        ? "google_ads_connections"
        : provider === "gsc"
          ? "gsc_connections"
          : "ga4_connections";
    const input = { provider, accountId: "google-a", userId: "u1" };

    it("removes all dependent mappings including archived and other-workspace projects", async () => {
      await grant(providerId);
      await mapping(provider, "p1");
      await mapping(provider, "p2");
      expect(await service.getRemovalImpact(input)).toEqual({
        projectCount: 2,
      });
      await service.removeAccount(input);
      expect(await rows(table)).toEqual([]);
      expect(await rows("account")).toEqual([]);
    });

    it("preserves other accounts, the other integration, and Google sign-in", async () => {
      await grant(providerId);
      await grant(providerId, "google-b");
      await grant(otherId);
      await grant("google");
      await mapping(provider, "p1");
      await mapping(provider, "p3", "google-b");
      await mapping(provider === "gsc" ? "ga4" : "gsc", "p4");
      await service.removeAccount(input);
      expect(await rows("account")).toHaveLength(3);
      expect((await rows(table)).map((row) => row.project_id)).toEqual(["p3"]);
      expect(
        await rows(provider === "gsc" ? "ga4_connections" : "gsc_connections"),
      ).toHaveLength(1);
    });

    it("cannot remove another user's grant or project mappings", async () => {
      await grant(providerId);
      await mapping(provider, "p1");
      expect(
        await service.getRemovalImpact({ ...input, userId: "u2" }),
      ).toEqual({ projectCount: 0 });
      await service.removeAccount({ ...input, userId: "u2" });
      expect(await rows("account")).toHaveLength(1);
      expect(await rows(table)).toHaveLength(1);
    });

    it("rolls project deletion back if deleting the authorization fails", async () => {
      await grant(providerId);
      await mapping(provider, "p1");
      await database.client.execute(
        "CREATE TRIGGER fail_remove BEFORE DELETE ON account BEGIN SELECT RAISE(ABORT, 'test failure'); END",
      );
      await expect(service.removeAccount(input)).rejects.toThrow();
      expect(await rows(table)).toHaveLength(1);
      expect(await rows("account")).toHaveLength(1);
    });
  });
}

it("includes legacy GSC mappings in removal without touching another user's legacy mappings", async () => {
  await grant("google-search-console");
  await mapping("gsc", "p1", null);
  await mapping("gsc", "p2", null, "u2");
  const input = {
    provider: "gsc" as const,
    accountId: "google-a",
    userId: "u1",
  };
  expect((await service.getRemovalImpact(input)).projectCount).toBe(1);
  await service.removeAccount(input);
  expect((await rows("gsc_connections")).map((row) => row.project_id)).toEqual([
    "p2",
  ]);
});

it.each(["same-account", "other-account", "other-user"] as const)(
  "GA4 preserves a missing email only for the same connection identity: %s",
  async (change) => {
    const base = {
      projectId: "p1",
      organizationId: "org1",
      propertyId: "properties/11",
      propertyDisplayName: "Site",
      propertyTimeZone: "America/New_York",
      propertyCurrencyCode: "USD",
      connectedByUserId: "u1",
      ga4AccountId: "google-a",
      connectedAccountEmail: "old@example.com",
    };
    await Ga4ConnectionRepository.upsert(base);
    const saved = await Ga4ConnectionRepository.upsert({
      ...base,
      connectedByUserId: change === "other-user" ? "u2" : "u1",
      ga4AccountId: change === "other-account" ? "google-b" : "google-a",
      connectedAccountEmail: null,
    });
    expect(saved.connectedAccountEmail).toBe(
      change === "same-account" ? "old@example.com" : null,
    );
  },
);

it.each(["same-account", "other-account", "other-user"] as const)(
  "GSC preserves a missing email only for the same connection identity: %s",
  async (change) => {
    const base = {
      projectId: "p1",
      organizationId: "org1",
      siteUrl: "https://example.com/",
      connectedByUserId: "u1",
      gscAccountId: "google-a",
      connectedAccountEmail: "old@example.com",
    };
    await GscConnectionRepository.upsert(base);
    const connectedByUserId = change === "other-user" ? "u2" : "u1";
    const gscAccountId = change === "other-account" ? "google-b" : "google-a";
    const saved = await GscConnectionRepository.upsert({
      ...base,
      connectedByUserId,
      gscAccountId,
      connectedAccountEmail: null,
    });
    expect(saved.connectedAccountEmail).toBe(
      change === "same-account" ? "old@example.com" : null,
    );
  },
);
