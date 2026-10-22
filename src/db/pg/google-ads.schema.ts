import { sql } from "drizzle-orm";
import { index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { projects } from "./app.schema";
import { organization } from "./better-auth-schema";
// OAuth tokens stay in the account table. This is the project's explicit Ads selection.
export const googleAdsConnections = pgTable(
  "google_ads_connections",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    customerId: text("customer_id").notNull(),
    loginCustomerId: text("login_customer_id").notNull(),
    customerName: text("customer_name").notNull(),
    connectedByUserId: text("connected_by_user_id").notNull(),
    googleAccountId: text("google_account_id").notNull(),
    connectedAccountEmail: text("connected_account_email"),
    createdAt: text("created_at")
      .notNull()
      .default(
        sql`to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`,
      ),
    updatedAt: text("updated_at")
      .notNull()
      .default(
        sql`to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`,
      ),
  },
  (table) => [
    uniqueIndex("google_ads_connections_project_idx").on(table.projectId),
    index("google_ads_connections_organization_idx").on(table.organizationId),
    index("google_ads_connections_connector_idx").on(
      table.connectedByUserId,
      table.googleAccountId,
    ),
  ],
);
