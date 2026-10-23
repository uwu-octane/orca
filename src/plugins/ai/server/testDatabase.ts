import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const client = createClient({ url: "file::memory:" });
export const database = { client, db: drizzle(client) };

export async function initializeAiDatabase() {
  await client.executeMultiple(
    "PRAGMA foreign_keys = ON; CREATE TABLE projects (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, archived_at TEXT);",
  );
  await client.executeMultiple(
    readFileSync("drizzle/sqlite/0060_greedy_wiccan.sql", "utf8") +
      ";" +
      readFileSync("drizzle/sqlite/0061_ancient_nuke.sql", "utf8"),
  );
}

export async function resetAiDatabase() {
  await client.executeMultiple(
    "DELETE FROM projects; INSERT INTO projects VALUES ('project-1','org-1',NULL), ('project-2','org-2',NULL);",
  );
}
