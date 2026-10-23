CREATE TABLE "ai_provider_configs" (
	"project_id" text NOT NULL,
	"provider" text NOT NULL,
	"endpoint" text NOT NULL,
	"timeout_ms" integer NOT NULL,
	"encrypted_api_key" text,
	"revision" text NOT NULL,
	CONSTRAINT "ai_provider_configs_project_id_provider_pk" PRIMARY KEY("project_id","provider")
);
--> statement-breakpoint
ALTER TABLE "ai_provider_configs" ADD CONSTRAINT "ai_provider_configs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;