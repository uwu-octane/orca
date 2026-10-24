import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import type { Context } from "cordis";
import { createSamTestRuntime } from "./testRuntime";

const fixture = await vi.hoisted(async () => {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const client = createClient({ url: "file::memory:" });
  return { client, db: drizzle(client) };
});
const mocks = vi.hoisted(() => ({
  identity: vi.fn(),
  event: vi.fn(),
  customer: vi.fn(),
  hosted: false,
}));
vi.mock("@/db", () => ({
  db: fixture.db,
  withPgClient: (fn: () => unknown) => fn(),
}));
vi.mock("cloudflare:workers", () => ({
  env: { DATABASE_PROVIDER: "d1" },
  waitUntil: (promise: Promise<unknown>) => promise,
}));
vi.mock("@/middleware/ensure-user/resolve", () => ({
  resolveUserContextFromHeaders: mocks.identity,
}));
vi.mock("@/server/lib/posthog", () => ({ captureServerEvent: mocks.event }));
vi.mock("@/server/billing/subscription", () => ({
  getOrCreateOrganizationCustomer: mocks.customer,
}));
vi.mock("@/server/lib/runtime-env", () => ({
  isHostedServerAuthMode: async () => mocks.hosted,
}));

let runtime: Context;
const scope = { projectId: "p1", organizationId: "org1", userId: "u1" };
const request = new Request("https://orca.example/agents/sam-chat/session");
beforeAll(async () => {
  await fixture.client.executeMultiple(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE user (id TEXT PRIMARY KEY);
    CREATE TABLE projects (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, name TEXT NOT NULL,
      domain TEXT, location_code INTEGER DEFAULT 2840, language_code TEXT DEFAULT 'en',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, archived_at TEXT, ai_research_keywords TEXT);
    INSERT INTO user VALUES ('u1'), ('u2');
  `);
  await fixture.client.executeMultiple(
    readFileSync("drizzle/sqlite/0028_empty_beyonder.sql", "utf8"),
  );
  runtime = await createSamTestRuntime();
});
afterAll(async () => {
  await runtime?.fiber.dispose();
  fixture.client.close();
});
beforeEach(async () => {
  await fixture.client.executeMultiple(`DELETE FROM projects;
    INSERT INTO projects (id,organization_id,name) VALUES ('p1','org1','First'),('p2','org1','Second'),('p3','org2','Third');`);
  mocks.identity.mockResolvedValue({
    ...scope,
    userEmail: "owner@example.com",
    role: "owner",
  });
  mocks.event.mockResolvedValue(undefined);
  mocks.customer.mockResolvedValue(undefined);
  mocks.hosted = false;
});

it("lists only the caller's sessions in the selected project", async () => {
  const own = await runtime.sam.sessions.create(scope);
  await runtime.sam.sessions.create({ ...scope, userId: "u2" });
  await runtime.sam.sessions.create({ ...scope, projectId: "p2" });
  expect((await runtime.sam.sessions.list(scope)).map((row) => row.id)).toEqual(
    [own.id],
  );
  expect(mocks.event).toHaveBeenCalledWith({
    distinctId: "u1",
    event: "sam:session_create",
    organizationId: "org1",
    properties: { project_id: "p1", session_id: own.id },
  });
});

it("denies creating and listing sessions outside the caller's organization", async () => {
  const wrong = { ...scope, projectId: "p3" };
  await expect(runtime.sam.sessions.create(wrong)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  await expect(runtime.sam.sessions.list(wrong)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  expect(
    (await fixture.client.execute("SELECT id FROM sam_sessions")).rows,
  ).toHaveLength(0);
  expect(mocks.event).not.toHaveBeenCalled();
});

it.each([{ userId: "u2" }, { organizationId: "org2" }])(
  "denies another user or organization access to a known session: %j",
  async (override) => {
    const session = await runtime.sam.sessions.create(scope);
    const wrong = { ...scope, ...override };
    await expect(
      runtime.sam.sessions.archive(session.id, wrong),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    mocks.identity.mockResolvedValue(wrong);
    expect(
      (await runtime.sam.sessions.authorizeConnection(request, session.id))
        ?.status,
    ).toBe(403);
    expect(mocks.customer).not.toHaveBeenCalled();
  },
);

it("archives without deleting history identity, then refuses both reopening and repeated archival", async () => {
  const { id } = await runtime.sam.sessions.create(scope);
  await runtime.sam.sessions.archive(id, scope);
  expect(await runtime.sam.sessions.list(scope)).toEqual([]);
  expect(
    (await fixture.client.execute("SELECT id, archived_at FROM sam_sessions"))
      .rows[0]?.id,
  ).toBe(id);
  expect(
    (await runtime.sam.sessions.authorizeConnection(request, id))?.status,
  ).toBe(403);
  await expect(runtime.sam.sessions.archive(id, scope)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  expect(mocks.event).toHaveBeenCalledWith({
    distinctId: "u1",
    event: "sam:session_archive",
    organizationId: "org1",
    properties: { project_id: "p1", session_id: id },
  });
});

it("denies a session in an archived project", async () => {
  const { id } = await runtime.sam.sessions.create(scope);
  await fixture.client.execute(
    "UPDATE projects SET archived_at = CURRENT_TIMESTAMP WHERE id = 'p1'",
  );
  expect(
    (await runtime.sam.sessions.authorizeConnection(request, id))?.status,
  ).toBe(403);
});

it("returns unauthorized before any customer bootstrap when identity resolution fails", async () => {
  mocks.identity.mockRejectedValue(new Error("not signed in"));
  expect(
    (await runtime.sam.sessions.authorizeConnection(request, "unknown"))
      ?.status,
  ).toBe(401);
  expect(mocks.customer).not.toHaveBeenCalled();
});

it("bootstraps hosted billing only after authorizing the session", async () => {
  const { id } = await runtime.sam.sessions.create(scope);
  expect(
    await runtime.sam.sessions.authorizeConnection(request, id),
  ).toBeUndefined();
  expect(mocks.customer).not.toHaveBeenCalled();
  mocks.hosted = true;
  expect(
    await runtime.sam.sessions.authorizeConnection(request, id),
  ).toBeUndefined();
  expect(mocks.customer).toHaveBeenCalledWith(expect.objectContaining(scope));
});

it("rejects session creation through a retained SAM service after unload", async () => {
  const isolated = await createSamTestRuntime();
  try {
    const sessions = isolated.sam.sessions;
    await isolated.fiber.dispose();
    await expect(sessions.create(scope)).rejects.toThrow(/not active/);
    expect(
      (await fixture.client.execute("SELECT id FROM sam_sessions")).rows,
    ).toHaveLength(0);
  } finally {
    await isolated.fiber.dispose();
  }
});
