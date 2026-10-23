import { pgTable, text } from "drizzle-orm/pg-core";
import { projects } from "./app.schema";

export const keywordGenerationConfigs = pgTable("keyword_generation_configs", {
  projectId: text("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  model: text("model").notNull(),
  encryptedApiKey: text("encrypted_api_key").notNull(),
  revision: text("revision").notNull(),
});
