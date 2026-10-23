import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { projects } from "./app.schema";

export const decisionConfigs = pgTable("decision_configs", {
  projectId: text("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  provider: text("provider", {
    enum: ["typesafe", "vercel_gateway", "systemone"],
  }).notNull(),
  endpoint: text("endpoint").notNull(),
  model: text("model").notNull(),
  timeoutMs: integer("timeout_ms").notNull(),
  encryptedApiKey: text("encrypted_api_key"),
  revision: text("revision").notNull(),
});
