import { readFileSync, rmSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, expect, vi } from "vitest";
import { Context } from "cordis";
import KeywordsService from "@/plugins/keywords/server";
import GoogleOAuthService from "@/plugins/google-oauth/server";
import * as googleAds from "@/plugins/google-ads";
let runtime: Context;
vi.mock(
  "@/plugins/google-oauth/server/connections/GoogleAdsConnectionRepository",
  () => ({ GoogleAdsConnectionRepository: { get: mocks.credentials } }),
);
vi.mock("@/plugins/google-ads/keywordIdeas", () => ({
  fetchGoogleKeywordIdeas: mocks.fetchIdeas,
}));
vi.mock("@/server/lib/runtime-env", () => ({
  isHostedServerAuthMode: async () => false,
}));
vi.mock("@/lib/auth", () => ({ getAuth: vi.fn() }));
import type {
  GoogleKeywordIdeasInput,
  GoogleKeywordResult,
} from "@/types/schemas/google-keywords";
import type * as R2Cache from "@/server/lib/r2-cache";

// Execute the production repository and migration against real SQLite.
const database = await vi.hoisted(async () => {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const nodePath = await import("node:path");
  // libSQL may reopen a connection after a transaction; a private file keeps
  // the schema alive across commits instead of recreating an empty :memory: DB.
  const directory = mkdtempSync(nodePath.join(tmpdir(), "orca-keyword-test-"));
  const client = createClient({
    url: `file:${nodePath.join(directory, "test.db")}`,
  });
  return { client, db: drizzle(client), statements: 0, directory };
});
const mocks = vi.hoisted(() => ({
  credentials: vi.fn(),
  fetchIdeas: vi.fn(),
  cache: new Map<string, unknown>(),
}));
vi.mock("cloudflare:workers", () => ({
  env: { DATABASE_PROVIDER: "d1" },
  DurableObject: class {
    kind = "test";
  },
  waitUntil: (task: Promise<unknown>) => task,
}));
vi.mock("@/db", () => ({
  db: database.db,
  withPgClient: (task: () => unknown) => task(),
}));
vi.mock("@/server/lib/r2-cache", async (importOriginal) => ({
  ...(await importOriginal<typeof R2Cache>()),
  getCached: async (key: string) => mocks.cache.get(key) ?? null,
  setCached: async (key: string, value: unknown) => {
    mocks.cache.set(key, value);
  },
}));
type TestStatement = PromiseLike<unknown> & {
  toSQL: () => { params: unknown[] };
};
vi.mock("@/db/runBatch", () => ({
  runBatch: async (
    build: (
      tx: Pick<typeof database.db, "insert" | "update" | "delete">,
    ) => [TestStatement, ...TestStatement[]],
  ) => {
    await database.db.transaction(async (tx) => {
      const queries = build(tx);
      for (const query of queries) {
        expect(query.toSQL().params.length).toBeLessThanOrEqual(100);
        await query;
      }
      database.statements += queries.length;
    });
  },
}));
beforeAll(async () => {
  runtime = new Context();
  await runtime.plugin(GoogleOAuthService);
  await runtime.plugin(googleAds);
  await runtime.plugin(KeywordsService);
  await database.client.executeMultiple(
    "PRAGMA foreign_keys = ON; CREATE TABLE projects (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, archived_at TEXT);",
  );
  await database.client.executeMultiple(
    readFileSync("drizzle/sqlite/0057_sudden_khan.sql", "utf8") +
      ";" +
      readFileSync("drizzle/sqlite/0062_military_triton.sql", "utf8") +
      ";" +
      readFileSync("drizzle/sqlite/0063_keyword_intents.sql", "utf8"),
  );
});
afterAll(async () => {
  await runtime.fiber.dispose();
  database.client.close();
  rmSync(database.directory, { recursive: true, force: true });
});
const input: GoogleKeywordIdeasInput = {
  projectId: "project-1",
  keywords: ["coffee"],
  geoTargetIds: ["2840"],
  languageId: "1000",
  network: "GOOGLE_SEARCH",
  includeAdultKeywords: false,
  pageSize: 150,
};
const context = { projectId: "project-1", organizationId: "org-1" };
const credentials = {
  customerId: "123",
  loginCustomerId: "",
  googleAccountId: "google-1",
  connectedByUserId: "user-1",
  updatedAt: "2026-10-22T00:00:00.000Z",
};
function result(
  overrides: Partial<GoogleKeywordResult> = {},
): GoogleKeywordResult {
  return {
    provider: "google_ads",
    fetchedAt: "2026-10-22T00:00:00.000Z",
    currencyCode: "EUR",
    nextPageToken: null,
    rows: [
      {
        keyword: "coffee",
        searchVolume: null,
        cpc: null,
        competition: null,
        trend: [],
        closeVariants: ["coffees"],
        keywordDifficulty: null,
        intent: "unknown",
        classification: { status: "not_requested" },
      },
    ],
    ...overrides,
  };
}
async function rows(query: string) {
  return (await database.client.execute(query)).rows;
}
beforeEach(async () => {
  vi.spyOn(runtime.googleOAuth, "getGoogleAccessToken").mockResolvedValue(
    "test-token",
  );
  await database.client.executeMultiple(
    "DELETE FROM projects; INSERT INTO projects VALUES ('project-1', 'org-1', NULL), ('project-2', 'org-2', NULL);",
  );
  database.statements = 0;
  mocks.cache.clear();
  mocks.credentials.mockResolvedValue(credentials);
  mocks.fetchIdeas.mockResolvedValue(result());
});

export { runtime, database, mocks, input, context, credentials, result, rows };
