CREATE TABLE "keyword_generation_configs" (
	"project_id" text PRIMARY KEY NOT NULL,
	"model" text NOT NULL,
	"encrypted_api_key" text NOT NULL,
	"revision" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "keyword_generation_configs" ADD CONSTRAINT "keyword_generation_configs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;