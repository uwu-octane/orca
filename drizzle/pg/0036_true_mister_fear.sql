CREATE TABLE "decision_configs" (
	"project_id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"endpoint" text NOT NULL,
	"model" text NOT NULL,
	"timeout_ms" integer NOT NULL,
	"encrypted_api_key" text,
	"revision" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "decision_configs" ADD CONSTRAINT "decision_configs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;