CREATE TABLE "google_keyword_search_locations" (
	"search_id" text NOT NULL,
	"geo_target_id" text NOT NULL,
	CONSTRAINT "google_keyword_search_locations_search_id_geo_target_id_pk" PRIMARY KEY("search_id","geo_target_id")
);
--> statement-breakpoint
CREATE TABLE "google_keyword_search_months" (
	"search_id" text NOT NULL,
	"row_position" integer NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"search_volume" bigint NOT NULL,
	CONSTRAINT "google_keyword_search_months_search_id_row_position_year_month_pk" PRIMARY KEY("search_id","row_position","year","month")
);
--> statement-breakpoint
CREATE TABLE "google_keyword_search_rows" (
	"search_id" text NOT NULL,
	"position" integer NOT NULL,
	"keyword" text NOT NULL,
	"search_volume" bigint,
	"cpc" double precision,
	"competition" double precision,
	CONSTRAINT "google_keyword_search_rows_search_id_position_pk" PRIMARY KEY("search_id","position")
);
--> statement-breakpoint
CREATE TABLE "google_keyword_search_seeds" (
	"search_id" text NOT NULL,
	"position" integer NOT NULL,
	"keyword" text NOT NULL,
	CONSTRAINT "google_keyword_search_seeds_search_id_position_pk" PRIMARY KEY("search_id","position")
);
--> statement-breakpoint
CREATE TABLE "google_keyword_search_variants" (
	"search_id" text NOT NULL,
	"row_position" integer NOT NULL,
	"keyword" text NOT NULL,
	CONSTRAINT "google_keyword_search_variants_search_id_row_position_keyword_pk" PRIMARY KEY("search_id","row_position","keyword")
);
--> statement-breakpoint
CREATE TABLE "google_keyword_searches" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"language_id" text NOT NULL,
	"network" text NOT NULL,
	"include_adult_keywords" boolean NOT NULL,
	"currency_code" text NOT NULL,
	"fetched_at" text NOT NULL,
	"page_size" integer NOT NULL,
	"page_token" text,
	"next_page_token" text,
	"dimension_revision" text
);
--> statement-breakpoint
CREATE TABLE "keyword_research_dimensions" (
	"search_id" text NOT NULL,
	"id" text NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"label_zh" text NOT NULL,
	CONSTRAINT "keyword_research_dimensions_search_id_id_pk" PRIMARY KEY("search_id","id")
);
--> statement-breakpoint
CREATE TABLE "keyword_research_subdimensions" (
	"search_id" text NOT NULL,
	"dimension_id" text NOT NULL,
	"id" text NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"label_zh" text NOT NULL,
	"active" boolean NOT NULL,
	CONSTRAINT "keyword_research_subdimensions_search_id_id_pk" PRIMARY KEY("search_id","id")
);
--> statement-breakpoint
ALTER TABLE "google_keyword_search_locations" ADD CONSTRAINT "google_keyword_search_locations_search_id_google_keyword_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."google_keyword_searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_keyword_search_months" ADD CONSTRAINT "google_keyword_search_months_search_id_row_position_google_keyword_search_rows_search_id_position_fk" FOREIGN KEY ("search_id","row_position") REFERENCES "public"."google_keyword_search_rows"("search_id","position") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_keyword_search_rows" ADD CONSTRAINT "google_keyword_search_rows_search_id_google_keyword_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."google_keyword_searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_keyword_search_seeds" ADD CONSTRAINT "google_keyword_search_seeds_search_id_google_keyword_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."google_keyword_searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_keyword_search_variants" ADD CONSTRAINT "google_keyword_search_variants_search_id_row_position_google_keyword_search_rows_search_id_position_fk" FOREIGN KEY ("search_id","row_position") REFERENCES "public"."google_keyword_search_rows"("search_id","position") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_keyword_searches" ADD CONSTRAINT "google_keyword_searches_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_research_dimensions" ADD CONSTRAINT "keyword_research_dimensions_search_id_google_keyword_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."google_keyword_searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_research_subdimensions" ADD CONSTRAINT "keyword_research_subdimensions_search_id_dimension_id_keyword_research_dimensions_search_id_id_fk" FOREIGN KEY ("search_id","dimension_id") REFERENCES "public"."keyword_research_dimensions"("search_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "google_keyword_searches_project_fetched_idx" ON "google_keyword_searches" USING btree ("project_id","fetched_at");