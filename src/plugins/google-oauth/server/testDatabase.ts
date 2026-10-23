import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import type { runBatch } from "@/db/runBatch";

/** Real SQLite, using the shipped grant and connection migrations. */
export async function createGoogleTestDatabase() {
  // libsql releases the in-memory database after a transaction commits.
  const directory = mkdtempSync(join(tmpdir(), "orca-google-auth-"));
  const client = createClient({ url: `file:${join(directory, "test.db")}` });
  const db = drizzle(client);
  await client.executeMultiple(`
    CREATE TABLE user (id text PRIMARY KEY);
    CREATE TABLE organization (id text PRIMARY KEY);
    CREATE TABLE projects (id text PRIMARY KEY, archived integer DEFAULT 0);
    INSERT INTO user VALUES ('u1'), ('u2');
    INSERT INTO organization VALUES ('org1'), ('org2');
    INSERT INTO projects VALUES ('p1',0), ('p2',1), ('p3',0), ('p4',0);
  `);
  for (const [file, include] of [
    [
      "0003_light_sage.sql",
      (sql: string) => /CREATE TABLE `(account|verification)`/.test(sql),
    ],
    [
      "0050_famous_crystal.sql",
      (sql: string) => sql.includes("CREATE UNIQUE INDEX"),
    ],
    [
      "0019_true_absorbing_man.sql",
      (sql: string) => !sql.includes("ALTER TABLE"),
    ],
    ["0039_ga4_connections.sql", () => true],
    [
      "0056_bouncy_the_twelve.sql",
      (sql: string) => !sql.includes("ALTER TABLE"),
    ],
  ] as const) {
    await client.executeMultiple(
      readFileSync(`drizzle/sqlite/${file}`, "utf8")
        .split("--> statement-breakpoint")
        .filter((sql) => include(sql) && !sql.includes("ALTER TABLE"))
        .join("\n"),
    );
  }
  await client.execute("ALTER TABLE gsc_connections ADD gsc_account_id text");
  return {
    client,
    db,
    close() {
      client.close();
      rmSync(directory, { recursive: true, force: true });
    },
    async reset() {
      await client.executeMultiple(
        "DELETE FROM gsc_connections; DELETE FROM ga4_connections; DELETE FROM google_ads_connections; DELETE FROM account; DELETE FROM verification;",
      );
    },
    async grant(
      provider: string,
      accountId = "google-a",
      userId = "u1",
      expiresAt: number | null = Date.now() + 3_600_000,
      refreshToken: string | null = "refresh",
    ) {
      await client.execute({
        sql: "INSERT INTO account (id, account_id, provider_id, user_id, updated_at, access_token, refresh_token, access_token_expires_at) VALUES (?, ?, ?, ?, 1, 'access', ?, ?)",
        args: [
          `${provider}-${userId}-${accountId}`,
          accountId,
          provider,
          userId,
          refreshToken,
          expiresAt,
        ],
      });
    },
    async runBatch(build: Parameters<typeof runBatch>[0]) {
      await db.transaction(async (tx) => {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- same Drizzle query surface, executed against real SQLite
        const executor = tx as unknown as Parameters<typeof build>[0];
        for (const statement of build(executor)) await statement;
      });
    },
  };
}
