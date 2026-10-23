import {
  integer,
  sqliteTable,
  text,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { projects } from "./app.schema";

export const aiProviderConfigs = sqliteTable(
  "ai_provider_configs",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    provider: text("provider", {
      enum: ["vercel_gateway", "typesafe", "systemone"],
    }).notNull(),
    endpoint: text("endpoint").notNull(),
    timeoutMs: integer("timeout_ms").notNull(),
    encryptedApiKey: text("encrypted_api_key"),
    keyName: text("key_name"),
    keyLastFour: text("key_last_four"),
    keyAddedAt: text("key_added_at"),
    lastUsedAt: text("last_used_at"),
    revision: text("revision").notNull(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.provider] })],
);
