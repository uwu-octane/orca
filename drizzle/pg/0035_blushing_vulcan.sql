CREATE TABLE "google_keyword_close_variants" (
	"metric_id" text NOT NULL,
	"keyword" text NOT NULL,
	CONSTRAINT "google_keyword_close_variants_metric_id_keyword_pk" PRIMARY KEY("metric_id","keyword")
);
--> statement-breakpoint
CREATE TABLE "google_keyword_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"scope_id" text NOT NULL,
	"keyword" text NOT NULL,
	"search_volume" bigint,
	"cpc" double precision,
	"competition" double precision,
	"fetched_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_keyword_monthly_volumes" (
	"metric_id" text NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"search_volume" bigint NOT NULL,
	CONSTRAINT "google_keyword_monthly_volumes_metric_id_year_month_pk" PRIMARY KEY("metric_id","year","month")
);
--> statement-breakpoint
CREATE TABLE "google_keyword_scope_locations" (
	"scope_id" text NOT NULL,
	"geo_target_id" text NOT NULL,
	CONSTRAINT "google_keyword_scope_locations_scope_id_geo_target_id_pk" PRIMARY KEY("scope_id","geo_target_id")
);
--> statement-breakpoint
CREATE TABLE "google_keyword_scopes" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"language_id" text NOT NULL,
	"network" text NOT NULL,
	"include_adult_keywords" boolean NOT NULL,
	"currency_code" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "google_keyword_close_variants" ADD CONSTRAINT "google_keyword_close_variants_metric_id_google_keyword_metrics_id_fk" FOREIGN KEY ("metric_id") REFERENCES "public"."google_keyword_metrics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_keyword_metrics" ADD CONSTRAINT "google_keyword_metrics_scope_id_google_keyword_scopes_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."google_keyword_scopes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_keyword_monthly_volumes" ADD CONSTRAINT "google_keyword_monthly_volumes_metric_id_google_keyword_metrics_id_fk" FOREIGN KEY ("metric_id") REFERENCES "public"."google_keyword_metrics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_keyword_scope_locations" ADD CONSTRAINT "google_keyword_scope_locations_scope_id_google_keyword_scopes_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."google_keyword_scopes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_keyword_scopes" ADD CONSTRAINT "google_keyword_scopes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "google_keyword_metrics_scope_keyword_idx" ON "google_keyword_metrics" USING btree ("scope_id","keyword");--> statement-breakpoint
CREATE INDEX "google_keyword_scopes_project_customer_idx" ON "google_keyword_scopes" USING btree ("project_id","customer_id");