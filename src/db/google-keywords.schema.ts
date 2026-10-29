import {
  foreignKey,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { projects } from "./app.schema";

// The ID fingerprints the complete market, including the unordered location
// set. Locations themselves remain explicit relations, not an encoded list.
export const googleKeywordScopes = sqliteTable(
  "google_keyword_scopes",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    customerId: text("customer_id").notNull(),
    languageId: text("language_id").notNull(),
    network: text("network").notNull(),
    includeAdultKeywords: integer("include_adult_keywords", {
      mode: "boolean",
    }).notNull(),
    currencyCode: text("currency_code").notNull(),
  },
  (table) => [
    index("google_keyword_scopes_project_customer_idx").on(
      table.projectId,
      table.customerId,
    ),
  ],
);

export const googleKeywordScopeLocations = sqliteTable(
  "google_keyword_scope_locations",
  {
    scopeId: text("scope_id")
      .notNull()
      .references(() => googleKeywordScopes.id, { onDelete: "cascade" }),
    geoTargetId: text("geo_target_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.scopeId, table.geoTargetId] })],
);

export const googleKeywordMetrics = sqliteTable(
  "google_keyword_metrics",
  {
    id: text("id").primaryKey(),
    scopeId: text("scope_id")
      .notNull()
      .references(() => googleKeywordScopes.id, { onDelete: "cascade" }),
    keyword: text("keyword").notNull(),
    searchVolume: integer("search_volume"),
    cpc: real("cpc"),
    competition: real("competition"),
    fetchedAt: text("fetched_at").notNull(),
  },
  (table) => [
    uniqueIndex("google_keyword_metrics_scope_keyword_idx").on(
      table.scopeId,
      table.keyword,
    ),
  ],
);

export const googleKeywordMonthlyVolumes = sqliteTable(
  "google_keyword_monthly_volumes",
  {
    metricId: text("metric_id")
      .notNull()
      .references(() => googleKeywordMetrics.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    searchVolume: integer("search_volume").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.metricId, table.year, table.month] }),
  ],
);

export const googleKeywordCloseVariants = sqliteTable(
  "google_keyword_close_variants",
  {
    metricId: text("metric_id")
      .notNull()
      .references(() => googleKeywordMetrics.id, { onDelete: "cascade" }),
    keyword: text("keyword").notNull(),
  },
  (table) => [primaryKey({ columns: [table.metricId, table.keyword] })],
);

// FORK: Immutable search pages own their editable taxonomy, independently of
// the latest per-market metrics above and the expiring provider cache.
export const googleKeywordSearches = sqliteTable(
  "google_keyword_searches",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    customerId: text("customer_id").notNull(),
    languageId: text("language_id").notNull(),
    network: text("network").notNull(),
    includeAdultKeywords: integer("include_adult_keywords", {
      mode: "boolean",
    }).notNull(),
    currencyCode: text("currency_code").notNull(),
    fetchedAt: text("fetched_at").notNull(),
    pageSize: integer("page_size").notNull(),
    pageToken: text("page_token"),
    nextPageToken: text("next_page_token"),
    dimensionRevision: text("dimension_revision"),
  },
  (table) => [
    index("google_keyword_searches_project_fetched_idx").on(
      table.projectId,
      table.fetchedAt,
    ),
  ],
);

export const googleKeywordSearchSeeds = sqliteTable(
  "google_keyword_search_seeds",
  {
    searchId: text("search_id")
      .notNull()
      .references(() => googleKeywordSearches.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    keyword: text("keyword").notNull(),
  },
  (table) => [primaryKey({ columns: [table.searchId, table.position] })],
);

export const googleKeywordSearchLocations = sqliteTable(
  "google_keyword_search_locations",
  {
    searchId: text("search_id")
      .notNull()
      .references(() => googleKeywordSearches.id, { onDelete: "cascade" }),
    geoTargetId: text("geo_target_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.searchId, table.geoTargetId] })],
);

export const googleKeywordSearchRows = sqliteTable(
  "google_keyword_search_rows",
  {
    searchId: text("search_id")
      .notNull()
      .references(() => googleKeywordSearches.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    keyword: text("keyword").notNull(),
    searchVolume: integer("search_volume"),
    cpc: real("cpc"),
    competition: real("competition"),
  },
  (table) => [primaryKey({ columns: [table.searchId, table.position] })],
);

export const googleKeywordSearchMonths = sqliteTable(
  "google_keyword_search_months",
  {
    searchId: text("search_id").notNull(),
    rowPosition: integer("row_position").notNull(),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    searchVolume: integer("search_volume").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.searchId, table.rowPosition, table.year, table.month],
    }),
    foreignKey({
      columns: [table.searchId, table.rowPosition],
      foreignColumns: [
        googleKeywordSearchRows.searchId,
        googleKeywordSearchRows.position,
      ],
    }).onDelete("cascade"),
  ],
);

export const googleKeywordSearchVariants = sqliteTable(
  "google_keyword_search_variants",
  {
    searchId: text("search_id").notNull(),
    rowPosition: integer("row_position").notNull(),
    keyword: text("keyword").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.searchId, table.rowPosition, table.keyword] }),
    foreignKey({
      columns: [table.searchId, table.rowPosition],
      foreignColumns: [
        googleKeywordSearchRows.searchId,
        googleKeywordSearchRows.position,
      ],
    }).onDelete("cascade"),
  ],
);

export const keywordResearchDimensions = sqliteTable(
  "keyword_research_dimensions",
  {
    searchId: text("search_id")
      .notNull()
      .references(() => googleKeywordSearches.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    labelZh: text("label_zh").notNull(),
  },
  (table) => [primaryKey({ columns: [table.searchId, table.id] })],
);

export const keywordResearchSubdimensions = sqliteTable(
  "keyword_research_subdimensions",
  {
    searchId: text("search_id").notNull(),
    dimensionId: text("dimension_id").notNull(),
    id: text("id").notNull(),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    labelZh: text("label_zh").notNull(),
    active: integer("active", { mode: "boolean" }).notNull(),
    // FORK: Membership questions belong to the subdimension, not a JSON settings blob.
    decisionInstructions: text("decision_instructions"),
    decisionTrue: text("decision_true"),
    decisionFalse: text("decision_false"),
  },
  (table) => [
    primaryKey({ columns: [table.searchId, table.id] }),
    foreignKey({
      columns: [table.searchId, table.dimensionId],
      foreignColumns: [
        keywordResearchDimensions.searchId,
        keywordResearchDimensions.id,
      ],
    }).onDelete("cascade"),
  ],
);

// FORK: one persisted intent decision per immutable search row.
export const googleKeywordSearchIntents = sqliteTable(
  "google_keyword_search_intents",
  {
    searchId: text("search_id").notNull(),
    rowPosition: integer("row_position").notNull(),
    intent: text("intent").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    decidedAt: text("decided_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.searchId, table.rowPosition] }),
    foreignKey({
      columns: [table.searchId, table.rowPosition],
      foreignColumns: [
        googleKeywordSearchRows.searchId,
        googleKeywordSearchRows.position,
      ],
    }).onDelete("cascade"),
  ],
);
