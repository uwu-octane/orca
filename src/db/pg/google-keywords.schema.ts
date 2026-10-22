import {
  bigint,
  boolean,
  doublePrecision,
  index,
  integer,
  primaryKey,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { projects } from "./app.schema";

// The ID fingerprints the complete market, including the unordered location
// set. Locations themselves remain explicit relations, not an encoded list.
export const googleKeywordScopes = pgTable(
  "google_keyword_scopes",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    customerId: text("customer_id").notNull(),
    languageId: text("language_id").notNull(),
    network: text("network").notNull(),
    includeAdultKeywords: boolean("include_adult_keywords").notNull(),
    currencyCode: text("currency_code").notNull(),
  },
  (table) => [
    index("google_keyword_scopes_project_customer_idx").on(
      table.projectId,
      table.customerId,
    ),
  ],
);

export const googleKeywordScopeLocations = pgTable(
  "google_keyword_scope_locations",
  {
    scopeId: text("scope_id")
      .notNull()
      .references(() => googleKeywordScopes.id, { onDelete: "cascade" }),
    geoTargetId: text("geo_target_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.scopeId, table.geoTargetId] })],
);

export const googleKeywordMetrics = pgTable(
  "google_keyword_metrics",
  {
    id: text("id").primaryKey(),
    scopeId: text("scope_id")
      .notNull()
      .references(() => googleKeywordScopes.id, { onDelete: "cascade" }),
    keyword: text("keyword").notNull(),
    searchVolume: bigint("search_volume", { mode: "number" }),
    cpc: doublePrecision("cpc"),
    competition: doublePrecision("competition"),
    fetchedAt: text("fetched_at").notNull(),
  },
  (table) => [
    uniqueIndex("google_keyword_metrics_scope_keyword_idx").on(
      table.scopeId,
      table.keyword,
    ),
  ],
);

export const googleKeywordMonthlyVolumes = pgTable(
  "google_keyword_monthly_volumes",
  {
    metricId: text("metric_id")
      .notNull()
      .references(() => googleKeywordMetrics.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    searchVolume: bigint("search_volume", { mode: "number" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.metricId, table.year, table.month] }),
  ],
);

export const googleKeywordCloseVariants = pgTable(
  "google_keyword_close_variants",
  {
    metricId: text("metric_id")
      .notNull()
      .references(() => googleKeywordMetrics.id, { onDelete: "cascade" }),
    keyword: text("keyword").notNull(),
  },
  (table) => [primaryKey({ columns: [table.metricId, table.keyword] })],
);
