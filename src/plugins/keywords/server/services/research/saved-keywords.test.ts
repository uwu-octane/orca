import { readFileSync } from "node:fs";
import { Context } from "cordis";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { getSavedKeywordsSchema } from "@/types/schemas/keywords";
import KeywordsService from "@/plugins/keywords/server";

const database = await vi.hoisted(async () => {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const client = createClient({ url: "file::memory:" });
  return { client, db: drizzle(client) };
});
vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("@/db", () => ({ db: database.db }));
vi.mock("@/db/runBatch", () => ({
  runBatch: (
    build: (tx: typeof database.db) => Parameters<typeof database.db.batch>[0],
  ) => database.db.batch(build(database.db)),
}));
const runtime = new Context();
beforeAll(async () => {
  for (const name of [
    "0000_fantastic_vanisher",
    "0002_fair_toad_men",
    "0013_fat_network",
    "0014_tag_color",
  ]) {
    await database.client.executeMultiple(
      readFileSync(`drizzle/sqlite/${name}.sql`, "utf8"),
    );
  }
  await database.client.execute(
    "INSERT INTO users (id, email) VALUES ('owner', 'owner@example.com')",
  );
  await runtime.plugin(KeywordsService);
});
beforeEach(async () => {
  await database.client.executeMultiple(
    "DELETE FROM projects; INSERT INTO projects (id, user_id, name) VALUES ('p1', 'owner', 'One'), ('p2', 'owner', 'Two');",
  );
});
afterAll(async () => {
  await runtime.fiber.dispose();
  database.client.close();
});
const input = {
  projectId: "p1",
  keywords: [" Coffee ", "coffee"],
  locationCode: 2840,
  languageCode: "en",
};

it("persists normalized keywords, metrics and appended/replaced tags through the installed service", async () => {
  await runtime.keywords.saveKeywords({
    ...input,
    tags: ["Research"],
    metrics: [{ keyword: "coffee", searchVolume: 0, cpc: 1.2 }],
  });
  await runtime.keywords.saveKeywords({
    ...input,
    tags: ["Plan"],
    tagMode: "append",
  });
  let saved = await runtime.keywords.getSavedKeywords(
    getSavedKeywordsSchema.parse({ projectId: "p1" }),
  );
  expect(saved.rows).toHaveLength(1);
  expect(saved.rows[0]).toMatchObject({
    keyword: "coffee",
    searchVolume: 0,
    cpc: 1.2,
  });
  expect(saved.rows[0].tags.map((tag) => tag.name)).toEqual([
    "Plan",
    "Research",
  ]);
  await runtime.keywords.saveKeywords({
    ...input,
    tags: ["Ready"],
    tagMode: "replace",
  });
  saved = await runtime.keywords.getSavedKeywords(
    getSavedKeywordsSchema.parse({ projectId: "p1" }),
  );
  expect(saved.rows[0].tags.map((tag) => tag.name)).toEqual(["Ready"]);
});

it("does not change another project's rows or tags when their IDs are supplied", async () => {
  const own = await runtime.keywords.saveKeywords({ ...input, tags: ["Own"] });
  const other = await runtime.keywords.saveKeywords({
    ...input,
    projectId: "p2",
    tags: ["Other"],
  });
  await runtime.keywords.updateSavedKeywordTags({
    projectId: "p1",
    savedKeywordIds: other.savedKeywordIds,
    addTags: ["Injected"],
  });
  await runtime.keywords.removeSavedKeywords("p1", {
    projectId: "p1",
    savedKeywordIds: [...own.savedKeywordIds, ...other.savedKeywordIds],
  });
  expect(
    (
      await runtime.keywords.getSavedKeywords(
        getSavedKeywordsSchema.parse({ projectId: "p1" }),
      )
    ).rows,
  ).toEqual([]);
  const saved = await runtime.keywords.getSavedKeywords(
    getSavedKeywordsSchema.parse({ projectId: "p2" }),
  );
  expect(saved.rows.map((row) => row.id)).toEqual(other.savedKeywordIds);
  expect(saved.rows[0].tags.map((tag) => tag.name)).toEqual(["Other"]);
});

it("rejects replace without tags while preserving the saved assignment", async () => {
  await runtime.keywords.saveKeywords({ ...input, tags: ["Keep"] });
  await expect(
    runtime.keywords.saveKeywords({ ...input, tagMode: "replace" }),
  ).rejects.toThrow("Replacement tags are required");
  expect(
    (
      await runtime.keywords.getSavedKeywords(
        getSavedKeywordsSchema.parse({ projectId: "p1" }),
      )
    ).rows[0].tags.map((tag) => tag.name),
  ).toEqual(["Keep"]);
});
