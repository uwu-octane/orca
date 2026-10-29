CREATE TABLE "google_keyword_search_intents" (
	"search_id" text NOT NULL,
	"row_position" integer NOT NULL,
	"intent" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"decided_at" text NOT NULL,
	CONSTRAINT "google_keyword_search_intents_search_id_row_position_pk" PRIMARY KEY("search_id","row_position")
);
--> statement-breakpoint
ALTER TABLE "google_keyword_search_intents" ADD CONSTRAINT "google_keyword_search_intents_search_id_row_position_google_keyword_search_rows_search_id_position_fk" FOREIGN KEY ("search_id","row_position") REFERENCES "public"."google_keyword_search_rows"("search_id","position") ON DELETE cascade ON UPDATE no action;